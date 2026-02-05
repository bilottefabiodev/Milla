import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import type { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export function useProfile(userId: string | undefined) {
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            if (!userId) return null

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            return data as Profile
        },
        enabled: !!userId,
    })

    const updateMutation = useMutation({
        mutationFn: async (updates: ProfileUpdate) => {
            if (!userId) throw new Error('No user ID')

            const { data, error } = await supabase
                .from('profiles')
                // @ts-ignore - Supabase type inference issue with update
                .update(updates)
                .eq('id', userId)
                .select()
                .single()

            if (error) throw error
            return data as Profile
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['profile', userId], data)
        },
    })

    const completeOnboarding = async (
        fullName: string,
        birthdate: string
    ) => {
        track('onboarding_completed', {
            user_id: userId,
            birthdate_year: new Date(birthdate).getFullYear()
        })

        return updateMutation.mutateAsync({
            full_name: fullName,
            birthdate,
            onboarding_completed_at: new Date().toISOString(),
            consent_terms_at: new Date().toISOString(),
            consent_disclaimer_at: new Date().toISOString(),
        })
    }

    return {
        profile: query.data,
        isLoading: query.isLoading,
        error: query.error,
        updateProfile: updateMutation.mutateAsync,
        completeOnboarding,
        isOnboardingComplete: !!query.data?.onboarding_completed_at,
    }
}
