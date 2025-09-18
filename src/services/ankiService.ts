interface AnkiConnectRequest {
  action: string;
  version: number;
  params?: any;
}

interface AnkiConnectResponse {
  result: any;
  error: string | null;
}

interface DeckInfo {
  name: string;
  cards: {
    new: number;
    learning: number;
    review: number;
  };
}

interface CardInfo {
  cardId: number;
  fields: Record<string, { value: string; order: number }>;
  fieldOrder: number;
  question: string;
  answer: string;
  modelName: string;
  deckName: string;
  css: string;
  factor: number;
  interval: number;
  note: number;
  ord: number;
  queue: number;
  reviews: number;
  reps: number;
  due: number;
  type: number;
  lapses: number;
}

class AnkiService {
  private readonly baseUrl = 'http://127.0.0.1:8765';

  private async request(action: string, params: any = {}): Promise<any> {
    try {
      const requestBody: AnkiConnectRequest = {
        action,
        version: 6,
        params
      };

      console.log(`AnkiConnect: ${action}`, params);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 0 || !response.status) {
          throw new Error('Cannot connect to AnkiConnect. Is Anki running?');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AnkiConnectResponse = await response.json();
      console.log(`AnkiConnect response:`, data);

      if (data.error) {
        throw new Error(data.error);
      }

      return data.result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to AnkiConnect. Make sure Anki is running and AnkiConnect addon is installed.');
      }
      console.error('AnkiConnect request failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const version = await this.request('version');
      console.log('AnkiConnect version:', version);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getDeckNames(): Promise<string[]> {
    const deckNames = await this.request('deckNames');
    console.log('Retrieved deck names:', deckNames);
    return deckNames;
  }

  async getDeckStats(deckName: string): Promise<DeckInfo> {
    try {
      // Use findCards to get counts for each card state
      const newCards = await this.request('findCards', { query: `deck:"${deckName}" is:new` });
      const learningCards = await this.request('findCards', { query: `deck:"${deckName}" is:learn` });
      const reviewCards = await this.request('findCards', { query: `deck:"${deckName}" is:review` });

      return {
        name: deckName,
        cards: {
          new: newCards.length || 0,
          learning: learningCards.length || 0,
          review: reviewCards.length || 0
        }
      };
    } catch (error) {
      console.warn(`getDeckStats failed for ${deckName}:`, error);

      // Return deck with zero stats on error
      return {
        name: deckName,
        cards: {
          new: 0,
          learning: 0,
          review: 0
        }
      };
    }
  }

  async getAllDeckStats(): Promise<DeckInfo[]> {
    const deckNames = await this.getDeckNames();
    console.log('Getting stats for decks:', deckNames);

    // Process decks one by one to avoid overwhelming AnkiConnect
    const results: DeckInfo[] = [];
    for (const deckName of deckNames) {
      try {
        const stats = await this.getDeckStats(deckName);
        results.push(stats);
        console.log(`Got stats for ${deckName}:`, stats);
      } catch (error) {
        console.error(`Failed to get stats for ${deckName}:`, error);
        // Still add the deck with zero stats
        results.push({
          name: deckName,
          cards: { new: 0, learning: 0, review: 0 }
        });
      }
    }

    return results;
  }

  async findCards(query: string): Promise<number[]> {
    return await this.request('findCards', { query });
  }

  async getCardInfo(cardIds: number[]): Promise<CardInfo[]> {
    return await this.request('cardsInfo', { cards: cardIds });
  }

  async answerCard(cardId: number, ease: number): Promise<void> {
    await this.request('answerCards', { answers: [{ cardId, ease }] });
  }

  async getStudyCards(deckName: string, limit: number = 50): Promise<CardInfo[]> {
    // Include both new cards and due cards for studying
    const cardIds = await this.findCards(`deck:"${deckName}" (is:new OR is:due)`);
    const limitedIds = cardIds.slice(0, limit);

    if (limitedIds.length === 0) {
      return [];
    }

    return await this.getCardInfo(limitedIds);
  }

  // Keep the old method for backward compatibility
  async getDueCards(deckName: string, limit: number = 50): Promise<CardInfo[]> {
    return this.getStudyCards(deckName, limit);
  }

  async studyDeck(deckName: string): Promise<void> {
    await this.request('guiDeckReview', { name: deckName });
  }

  async syncAnki(): Promise<void> {
    await this.request('sync');
  }

  async createNote(deckName: string, modelName: string, fields: Record<string, string>, tags: string[] = []): Promise<number> {
    const note = {
      deckName,
      modelName,
      fields,
      tags
    };

    return await this.request('addNote', { note });
  }

  async getModelNames(): Promise<string[]> {
    return await this.request('modelNames');
  }

  async getModelFieldNames(modelName: string): Promise<string[]> {
    return await this.request('modelFieldNames', { modelName });
  }

  async createDeck(deckName: string): Promise<void> {
    await this.request('createDeck', { deck: deckName });
  }

  async addCard(deckName: string, front: string, back: string): Promise<void> {
    const note = {
      deckName,
      modelName: 'Basic',
      fields: {
        Front: front,
        Back: back,
      },
      tags: [],
    };
    await this.request('addNote', { note });
  }
}

export const ankiService = new AnkiService();
export type { DeckInfo, CardInfo };