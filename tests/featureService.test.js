import { describe, it } from 'node:test';
import assert from 'node:assert';
import FeatureService from '../api/services/featureService.js';

describe('FeatureService', () => {
  it('deve executar serviço com parâmetros válidos', () => {
    const res = FeatureService.execute({ action: 'test' });
    assert.strictEqual(res.status, 'SUCCESS');
  });
});
