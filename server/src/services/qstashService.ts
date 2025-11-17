/**
 * QStash Service
 * Serviço para integração com QStash (Upstash Queue)
 * 
 * QStash é uma fila de mensagens serverless que permite processar tarefas de forma assíncrona
 * Usa a biblioteca oficial @upstash/qstash
 */

import { Client } from '@upstash/qstash';
import { qstashConfig } from '../config';

export interface QStashMessage {
  studentExamId: number;
  questionId: number;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  model: string;
  questionType?: 'open' | 'closed';
}

export interface QStashConfig {
  token: string;
  queueName?: string;
}

export class QStashService {
  private client: Client;
  private queueName: string;
  private webhookUrl: string;

  constructor(config: QStashConfig) {
    // Configura o Client com token e baseUrl (para desenvolvimento local)
    const clientConfig: any = {
      token: config.token
    };

    // Se baseUrl estiver configurado (para QStash CLI local), adiciona ao config
    if (qstashConfig.baseUrl && qstashConfig.baseUrl !== 'https://qstash.upstash.io') {
      clientConfig.baseUrl = qstashConfig.baseUrl;
      console.log('🔧 [QStash] Usando QStash local:', qstashConfig.baseUrl);
    } else {
      console.log('🔧 [QStash] Usando QStash em produção');
    }

    this.client = new Client(clientConfig);

    this.queueName = config.queueName || qstashConfig.queueName;
    this.webhookUrl = qstashConfig.webhookUrl;
  }

  /**
   * Envia uma mensagem para QStash na fila 'questions'
   * @param message Dados da correção a ser processada
   * @returns Promise com o ID da mensagem
   */
  public async publish(message: QStashMessage): Promise<string> {
    try {
      const payload = {
        id: message.studentExamId,
        model: message.model,
        questionId: message.questionId,
        questionText: message.questionText,
        studentAnswer: message.studentAnswer,
        correctAnswer: message.correctAnswer,
        questionType: message.questionType || 'open'
      };

      // Enfileira na fila 'questions' usando queue().enqueueJSON()
      const queue = this.client.queue({ queueName: this.queueName });
      const result = await queue.enqueueJSON({
        url: this.webhookUrl,
        body: payload,
        queue: this.queueName
      });

      return result.messageId;
    } catch (error) {
      console.error('❌ [QStash] Erro ao enfileirar mensagem:', error);
      throw error;
    }
  }

  /**
   * Envia múltiplas mensagens para QStash na fila 'questions'
   * @param messages Array de mensagens
   * @returns Promise com array de IDs das mensagens
   */
  public async publishBatch(messages: QStashMessage[]): Promise<string[]> {
    const promises = messages.map(message => 
      this.publish(message).catch(error => {
        console.error('Error publishing message to QStash:', error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((id): id is string => id !== null);
  }

  /**
   * Valida se o token do QStash está configurado
   */
  public isConfigured(): boolean {
    return !!this.client && !!qstashConfig.token;
  }

  /**
   * Obtém a URL do webhook configurada
   */
  public getWebhookUrl(): string {
    return this.webhookUrl;
  }

  /**
   * Obtém o nome da fila configurada
   */
  public getQueueName(): string {
    return this.queueName;
  }
}

/**
 * Instância singleton do QStashService
 */
export const qstashService = new QStashService({
  token: qstashConfig.token,
  queueName: qstashConfig.queueName
});
