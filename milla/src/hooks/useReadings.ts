import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database, ReadingSection, ReadingContent } from '../types/database'

type Reading = Database['public']['Tables']['readings']['Row']
type Job = Database['public']['Tables']['jobs']['Row']

export function useReadings(userId: string | undefined) {
    const readingsQuery = useQuery({
        queryKey: ['readings', userId],
        queryFn: async () => {
            if (!userId) return []

            const { data, error } = await supabase
                .from('readings')
                .select('*')
                .eq('user_id', userId)

            if (error) throw error
            return data as Reading[]
        },
        enabled: !!userId,
        refetchInterval: 5000, // Poll every 5s while generating
    })

    const jobsQuery = useQuery({
        queryKey: ['jobs', userId],
        queryFn: async () => {
            if (!userId) return []

            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as Job[]
        },
        enabled: !!userId,
        refetchInterval: 3000, // Poll more frequently for job status
    })

    const getReadingBySection = (section: ReadingSection): Reading | undefined => {
        return readingsQuery.data?.find(r => r.section === section)
    }

    const getJobStatus = (): 'idle' | 'pending' | 'processing' | 'completed' | 'failed' => {
        const jobs = jobsQuery.data ?? []

        if (jobs.length === 0) return 'idle'

        const hasPending = jobs.some(j => j.status === 'pending')
        const hasProcessing = jobs.some(j => j.status === 'processing')
        const hasFailed = jobs.some(j => j.status === 'failed')
        const allCompleted = jobs.every(j => j.status === 'completed')

        if (hasProcessing) return 'processing'
        if (hasPending) return 'pending'
        if (hasFailed) return 'failed'
        if (allCompleted) return 'completed'

        return 'idle'
    }

    const hasAllReadings = (): boolean => {
        const sections: ReadingSection[] = [
            'missao_da_alma',
            'personalidade',
            'destino',
            'proposito',
            'manifestacao_material',
        ]
        return sections.every(s => getReadingBySection(s))
    }

    return {
        readings: readingsQuery.data ?? [],
        jobs: jobsQuery.data ?? [],
        isLoading: readingsQuery.isLoading || jobsQuery.isLoading,
        error: readingsQuery.error || jobsQuery.error,
        getReadingBySection,
        getJobStatus,
        hasAllReadings,
        refetch: () => {
            readingsQuery.refetch()
            jobsQuery.refetch()
        },
    }
}
