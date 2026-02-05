import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

export function useSubscription(userId: string | undefined) {
    const query = useQuery({
        queryKey: ['subscription', userId],
        queryFn: async () => {
            if (!userId) return null

            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single()

            // No subscription is not an error
            if (error?.code === 'PGRST116') return null
            if (error) throw error

            return data as Subscription
        },
        enabled: !!userId,
    })

    const isActive = (): boolean => {
        if (!query.data) return false

        const { status, current_period_end } = query.data

        if (status !== 'active') return false
        if (!current_period_end) return false

        return new Date(current_period_end) > new Date()
    }

    return {
        subscription: query.data,
        isLoading: query.isLoading,
        error: query.error,
        isActive: isActive(),
        refetch: query.refetch,
    }
}
