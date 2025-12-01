import React from 'react';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ExamPage from '../../pages/ExamPage';
import AICorrectionService from '../../services/AICorrectionService';
import ExamsService from '../../services/ExamsService';

// Mock dos serviços
jest.mock('../../services/AICorrectionService', () => ({
  __esModule: true,
  default: {
    triggerAICorrection: jest.fn(),
  },
}));

jest.mock('../../services/ExamsService', () => ({
  __esModule: true,
  default: {
    getExamsForClass: jest.fn(),
    getStudentsWithExamsForClass: jest.fn(),
    createAndGenerateExams: jest.fn(),
  },
}));

import path from 'path';

const featurePath = path.join(__dirname, '../../../../tests/features/ai-correction.feature');
const feature = loadFeature(featurePath);

defineFeature(feature, (test) => {
  // Aumenta o timeout para testes de GUI
  jest.setTimeout(15000);

  const mockTriggerAICorrection = AICorrectionService.triggerAICorrection as jest.MockedFunction<typeof AICorrectionService.triggerAICorrection>;
  const mockGetExamsForClass = ExamsService.getExamsForClass as jest.MockedFunction<typeof ExamsService.getExamsForClass>;
  const mockGetStudentsWithExamsForClass = ExamsService.getStudentsWithExamsForClass as jest.MockedFunction<typeof ExamsService.getStudentsWithExamsForClass>;

  const classId = 'Engenharia de Software e Sistemas-2025-1';

  // Função auxiliar para renderizar o componente
  const renderExamPage = () => {
    const route = `/exam/${encodeURIComponent(classId)}`;
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const routerElement = React.createElement(
        MemoryRouter as any,
        { initialEntries: [route] },
        React.createElement(
          Routes as any,
          {},
          React.createElement(Route as any, { path: '/exam/:id', element: React.createElement(ExamPage) })
        )
      );
      render(routerElement);
    });
  };

  // Função auxiliar para aguardar componente carregar
  const waitForComponentToLoad = async () => {
    await waitFor(() => {
      expect(mockGetExamsForClass).toHaveBeenCalledWith(classId);
    }, { timeout: 10000 });

    await waitFor(() => {
      const loadingText = screen.queryByText(/carregando/i);
      return loadingText === null;
    }, { timeout: 10000 });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock das chamadas de API
    mockGetExamsForClass.mockResolvedValue({
      data: [
        { id: 1, title: 'Requisitos', classId: classId },
        { id: 2, title: 'Gerência', classId: classId }
      ]
    });

    mockGetStudentsWithExamsForClass.mockResolvedValue({
      data: [
        {
          studentName: 'João Silva',
          examID: 1,
          qtdAberta: 2,
          qtdFechada: 3,
          ativo: 'Sim',
          questions: []
        }
      ]
    });
  });

  // Cenário 1: Successful Initiation with Model Selection
  test('Successful Initiation with Model Selection', ({ given, when, and, then }) => {
    given(/^teacher "(.*)" is viewing the exam "(.*)"$/, (teacherName, examName) => {
      renderExamPage();
    });

    when(/^the teacher asks the system to grade the open questions in the exam "(.*)"$/, async (examName) => {
      const user = userEvent.setup();
      await waitForComponentToLoad();

      const correctButton = await screen.findByRole('button', { name: /corrigir com ia/i }, { timeout: 10000 });
      expect(correctButton).toBeInTheDocument();
      expect(correctButton).not.toBeDisabled();
      await user.click(correctButton);

      await waitFor(() => {
        expect(screen.getByText(/selecionar modelo de ia/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    and(/^the teacher selects the model "(.*)"$/, async (modelName) => {
      const user = userEvent.setup();
      
      // Seleciona o modelo no dropdown - clica no botão do dropdown
      const dropdownButton = screen.getByRole('button', { name: /selecione um modelo/i });
      expect(dropdownButton).toBeInTheDocument();
      await user.click(dropdownButton);

      // Aguarda as opções aparecerem e seleciona o modelo
      await waitFor(() => {
        const modelOption = screen.getByText(modelName);
        expect(modelOption).toBeInTheDocument();
      }, { timeout: 3000 });
      
      const modelOption = screen.getByText(modelName);
      await user.click(modelOption);

      // Clica em confirmar
      const confirmButton = screen.getByRole('button', { name: /confirmar/i });
      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton);
    });

    then(/^the system initiates the exam correction process$/, async () => {
      // Mock da resposta de sucesso
      mockTriggerAICorrection.mockResolvedValue({
        message: 'Correção iniciada com sucesso',
        estimatedTime: '5 minutos',
        totalStudentExams: 1,
        totalOpenQuestions: 2,
        queuedMessages: 2
      });

      await waitFor(() => {
        expect(mockTriggerAICorrection).toHaveBeenCalledWith(classId, 'Gemini 2.5 Flash');
      }, { timeout: 5000 });
    });

    and(/^a feedback message appears informing that the process was started with "(.*)"$/, async (modelName) => {
      await waitFor(() => {
        const successModal = screen.getByText(/correção iniciada com sucesso/i);
        expect(successModal).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verifica que o modal contém o nome do modelo
      const modelText = screen.getByText(new RegExp(modelName, 'i'));
      expect(modelText).toBeInTheDocument();
    });

    and(/^the feedback message includes the estimated correction completion time\.$/, async () => {
      // Verifica que o modal contém o tempo estimado
      await waitFor(() => {
        const estimatedTime = screen.getByText(/tempo estimado/i);
        expect(estimatedTime).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // Cenário 2: Attempt to Confirm Without Selecting Any Model
  test('Attempt to Confirm Without Selecting Any Model', ({ given, when, then, and }) => {
    given(/^teacher "(.*)" is viewing the exam "(.*)"$/, (teacherName, examName) => {
      renderExamPage();
    });

    when(/^the teacher asks the system to grade the open questions in the exam "(.*)" without selecting any model$/, 
      async (examName) => {
        const user = userEvent.setup();
        await waitForComponentToLoad();

        const correctButton = await screen.findByRole('button', { name: /corrigir com ia/i }, { timeout: 10000 });
        expect(correctButton).toBeInTheDocument();
        expect(correctButton).not.toBeDisabled();
        await user.click(correctButton);

        await waitFor(() => {
          expect(screen.getByText(/selecionar modelo de ia/i)).toBeInTheDocument();
        }, { timeout: 5000 });

        // Tenta confirmar sem selecionar um modelo
        const confirmButton = screen.getByRole('button', { name: /confirmar/i });
        expect(confirmButton).toBeInTheDocument();
        await user.click(confirmButton);
      }
    );

    then(/^the system displays a validation error message "(.*)"$/, async (expectedMessage) => {
      await waitFor(() => {
        const errorMessage = screen.getByText(expectedMessage);
        expect(errorMessage).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    and(/^the correction process is not initiated$/, async () => {
      expect(mockTriggerAICorrection).not.toHaveBeenCalled();
      expect(screen.queryByText(/correção iniciada com sucesso/i)).not.toBeInTheDocument();
    });
  });

  // Cenário 3: Failure Alert During Correction Initiation
  test('Failure Alert During Correction Initiation', ({ given, when, and, then }) => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock do window.alert
      alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      if (alertSpy) {
        alertSpy.mockRestore();
      }
    });

    given(/^teacher "(.*)" is viewing the exam "(.*)"$/, (teacherName, examName) => {
      renderExamPage();
    });

    when(/^the teacher asks the system to grade the open questions in the exam "(.*)"$/, async (examName) => {
      const user = userEvent.setup();
      await waitForComponentToLoad();

      const correctButton = await screen.findByRole('button', { name: /corrigir com ia/i }, { timeout: 10000 });
      expect(correctButton).toBeInTheDocument();
      expect(correctButton).not.toBeDisabled();
      await user.click(correctButton);

      await waitFor(() => {
        expect(screen.getByText(/selecionar modelo de ia/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    and(/^the teacher selects the model "(.*)"$/, async (modelName) => {
      // Configura o mock de falha ANTES de selecionar o modelo
      mockTriggerAICorrection.mockRejectedValue(new Error('Erro ao iniciar a correção. Por favor, tente novamente.'));

      const user = userEvent.setup();
      
      // Seleciona o modelo no dropdown
      const dropdownButton = screen.getByRole('button', { name: /selecione um modelo/i });
      expect(dropdownButton).toBeInTheDocument();
      await user.click(dropdownButton);

      await waitFor(() => {
        const modelOption = screen.getByText(modelName);
        expect(modelOption).toBeInTheDocument();
      }, { timeout: 3000 });
      
      const modelOption = screen.getByText(modelName);
      await user.click(modelOption);

      const confirmButton = screen.getByRole('button', { name: /confirmar/i });
      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton);
    });

    and(/^the system fails to initiate the correction process$/, () => {
      // Mock já foi configurado no step anterior
    });

    then(/^the system displays a failure alert "(.*)"$/, async (expectedAlert) => {
      // Aguarda a chamada da API
      await waitFor(() => {
        expect(mockTriggerAICorrection).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Verifica que o alert foi chamado com a mensagem correta
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expectedAlert);
      }, { timeout: 5000 });

      // Verifica mensagem de erro na tela
      await waitFor(() => {
        const errorMessage = screen.getByText(expectedAlert);
        expect(errorMessage).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    and(/^the correction process is not initiated$/, async () => {
      // Verifica que o modal de sucesso NÃO aparece
      expect(screen.queryByText(/correção iniciada com sucesso/i)).not.toBeInTheDocument();
    });
  });
});

