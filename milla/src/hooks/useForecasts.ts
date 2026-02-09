import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Forecast, ForecastFilter } from '../types/forecast'

interface UseForecastsReturn {
    forecasts: Forecast[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useForecasts(
    userId: string | undefined,
    filter?: ForecastFilter
): UseForecastsReturn {
    const query = useQuery({
        queryKey: ['forecasts', userId, filter],
        queryFn: async () => {
            if (!userId) return []

            let queryBuilder = supabase
                .from('forecasts')
                .select('*')
                .eq('user_id', userId)
                .not('delivered_at', 'is', null)
                .order('delivered_at', { ascending: false })

            // Apply type filter
            if (filter?.type && filter.type !== 'all') {
                queryBuilder = queryBuilder.eq('type', filter.type)
            }

            // Apply date filters
            if (filter?.startDate) {
                queryBuilder = queryBuilder.gte('period_start', filter.startDate)
            }
            if (filter?.endDate) {
                queryBuilder = queryBuilder.lte('period_end', filter.endDate)
            }

            const { data, error } = await queryBuilder

            if (error) throw error
            return (data as Forecast[]) || []
        },
        enabled: !!userId,
    })

    return {
        forecasts: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    }
}

// Hook for a single forecast
export function useForecast(forecastId: string | undefined) {
    return useQuery({
        queryKey: ['forecast', forecastId],
        queryFn: async () => {
            if (!forecastId) return null

            const { data, error } = await supabase
                .from('forecasts')
                .select('*')
                .eq('id', forecastId)
                .single()

            if (error) throw error
            return data as Forecast
        },
        enabled: !!forecastId,
    })
}
