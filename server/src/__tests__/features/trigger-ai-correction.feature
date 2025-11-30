Feature: Trigger AI Correction API

  Scenario: Iniciar correção AI com sucesso
    Given existe uma classe com id "Engenharia de Software e Sistemas-2025-1"
    And existem exames de estudantes para a classe "Engenharia de Software e Sistemas-2025-1"
    And os exames possuem questões abertas com respostas dos estudantes
    And o QStash está configurado corretamente
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo classId "Engenharia de Software e Sistemas-2025-1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "200"
    And o JSON da resposta deve conter message "Correção iniciada com sucesso"
    And o JSON da resposta deve conter estimatedTime
    And o JSON da resposta deve conter totalStudentExams maior que 0
    And o JSON da resposta deve conter totalOpenQuestions maior que 0
    And o JSON da resposta deve conter queuedMessages maior que 0

  Scenario: Falhar ao iniciar correção quando classId não é fornecido
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo apenas model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Class ID and model are required"

  Scenario: Falhar ao iniciar correção quando model não é fornecido
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo apenas classId "Engenharia de Software e Sistemas-2025-1"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Class ID and model are required"

  Scenario: Falhar ao iniciar correção quando model é inválido
    Given existe uma classe com id "Engenharia de Software e Sistemas-2025-1"
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo classId "Engenharia de Software e Sistemas-2025-1" e model "gpt-4"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Invalid model. Only Gemini 2.5 Flash is supported"

  Scenario: Falhar ao iniciar correção quando não existem exames de estudantes para a classe
    Given existe uma classe com id "class-999"
    And não existem exames de estudantes para a classe "class-999"
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo classId "class-999" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "404"
    And o JSON da resposta deve conter error "No student exams found for this class"

  Scenario: Falhar ao iniciar correção quando QStash não está configurado
    Given existe uma classe com id "Engenharia de Software e Sistemas-2025-1"
    And existem exames de estudantes para a classe "Engenharia de Software e Sistemas-2025-1"
    And os exames possuem questões abertas com respostas dos estudantes
    And o QStash não está configurado
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo classId "Engenharia de Software e Sistemas-2025-1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "500"
    And o JSON da resposta deve conter error "QStash não está configurado. Configure o QSTASH_TOKEN no arquivo .env"

  Scenario: Falhar ao iniciar correção quando não existem questões abertas
    Given existe uma classe com id "Engenharia de Software e Sistemas-2025-1"
    And existem exames de estudantes para a classe "Engenharia de Software e Sistemas-2025-1"
    And os exames não possuem questões abertas ou as questões abertas não possuem respostas dos estudantes
    And o QStash está configurado corretamente
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo classId "Engenharia de Software e Sistemas-2025-1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Nenhuma questão aberta encontrada para correção"

  Scenario: Falhar ao iniciar correção quando ocorre erro ao enviar mensagens para QStash
    Given existe uma classe com id "Engenharia de Software e Sistemas-2025-1"
    And existem exames de estudantes para a classe "Engenharia de Software e Sistemas-2025-1"
    And os exames possuem questões abertas com respostas dos estudantes
    And o QStash está configurado corretamente
    And o QStash falha ao processar publishBatch
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo classId "Engenharia de Software e Sistemas-2025-1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "500"
    And o JSON da resposta deve conter error "Erro ao enviar mensagens para QStash"
    And o JSON da resposta deve conter details
