Feature: Open Question Grading
  As a teacher
  I want to grade open questions using an AI model
  So that I can save time and improve the accuracy of the grades

  @gui @ai-correction
  Scenario: Successful Initiation with Model Selection
  Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Exame de Requisitos"
  And the teacher selects the model "Gemini 2.5 Flash"
  Then the system initiates the exam correction process
  And a feedback message appears informing that the process was started with "Gemini 2.5 Flash"
  And the feedback message includes the estimated correction completion time.

  @gui @ai-correction
  Scenario: Attempt to Confirm Without Selecting Any Model
  Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Exame de Requisitos" without selecting any model
  Then the system displays a validation error message "Você deve selecionar um modelo de IA para continuar"
  And the correction process is not initiated

  @gui @ai-correction
  Scenario: Failure Alert During Correction Initiation
  Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Exame de Requisitos"
  And the teacher selects the model "Gemini 2.5 Flash"
  And the system fails to initiate the correction process
  Then the system displays a failure alert "Erro ao iniciar a correção. Por favor, tente novamente."
  And the correction process is not initiated

  @gui @ai-correction
  Scenario: Failure When Exam is Not Found
    Given teacher "Paulo" is viewing an exam that no longer exists
    When the teacher clicks the button "Corrigir Abertas"
    Then the system displays an error message "Prova não encontrada."
    And the model selection modal is not opened

  @gui @ai-correction
  Scenario: Failure When Exam Has No Open Questions
    Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
    And the exam "Exame de Requisitos" has only closed questions
    When the teacher selects the model "Gemini 2.5 Flash"
    And the teacher confirms the selection
    Then the system displays an error message "Nenhuma questão aberta encontrada para este exame"
    And the correction process is not initiated

  @gui @ai-correction
  Scenario: Failure When No Open Question Responses Exist
    Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
    And the exam "Exame de Requisitos" has open questions
    But no students have answered the open questions
    When the teacher selects the model "Gemini 2.5 Flash"
    And the teacher confirms the selection
    Then the system displays an error message "Nenhuma resposta aberta encontrada para correção"
    And the correction process is not initiated

  @gui @ai-correction
  Scenario: Failure When Network Request Fails
    Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
    And the network request fails
    When the teacher selects the model "Gemini 2.5 Flash"
    And the teacher confirms the selection
    Then the system displays a network error message
    And the correction process is not initiated