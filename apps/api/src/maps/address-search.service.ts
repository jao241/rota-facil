import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface GeoapifyResult {
  place_id?: string;
  formatted?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
  rank?: { confidence?: number };
  properties?: GeoapifyResult;
}

@Injectable()
export class AddressSearchService {
  async search(text: string) {
    const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'address_search_not_configured',
        message: 'A busca por endereço não está configurada. Defina GEOAPIFY_API_KEY para a API.',
      });
    }

    const params = new URLSearchParams({
      text: text.trim(),
      filter: 'countrycode:br',
      lang: 'pt',
      format: 'json',
      limit: '5',
      apiKey,
    });

    try {
      const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        const detail = response.status === 429
          ? 'O limite de consultas do serviço de endereços foi atingido.'
          : 'O serviço de busca por endereço está indisponível.';
        throw new Error(detail);
      }

      const body = await response.json() as GeoapifyResult[] | { results?: GeoapifyResult[]; features?: GeoapifyResult[] };
      const results = Array.isArray(body) ? body : body.results ?? body.features ?? [];
      return results.flatMap((result) => {
        const properties = result.properties ?? result;
        const lat = properties.lat;
        const lon = properties.lon;
        const label = properties.formatted;
        if (!label || typeof lat !== 'number' || !Number.isFinite(lat) || typeof lon !== 'number' || !Number.isFinite(lon)) return [];
        return [{
          id: properties.place_id ?? `${lon},${lat}`,
          label,
          latitude: lat,
          longitude: lon,
          resultType: properties.result_type ?? null,
          confidence: properties.rank?.confidence ?? null,
        }];
      });
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'address_search_unavailable',
        message: error instanceof Error && error.message.includes('limite de consultas')
          ? error.message
          : 'Não foi possível consultar endereços agora. Tente novamente em instantes.',
      });
    }
  }
}
