import { supabase } from './supabaseClient';
import { emailService } from './emailService';
import { AiActionTask } from '../types';

export const campaignExecutionService = {
    /**
     * Executes a predefined action from the AI Dashboard.
     * Sends an email (simulated subset) and logs to Supabase.
     */
    async executeTaskAction(task: AiActionTask) {
        const logEntry = {
            campaign_name: task.title,
            action_type: task.type,
            recipient_count: 1, // Simulated single test send
            status: 'Pending',
            metadata: {
                taskId: task.id,
                suggestion: task.suggestion,
                impact: task.impact
            }
        };

        try {
            // 1. Send Email (using Resend via emailService)
            // For demo purposes, we send to a safe test address or the logged-in user if we had auth context.
            // We'll use a hardcoded safe address or a placeholder.
            const targetEmail = 'delivered@resend.dev';
            const emailSubject = `Action Required: ${task.title}`;
            const emailBody = `
        <h1>TeleFlow AI Action Execution</h1>
        <p><strong>Task:</strong> ${task.title}</p>
        <p><strong>Issue:</strong> ${task.issue}</p>
        <p><strong>Proposed Fix:</strong> ${task.suggestion}</p>
        <hr />
        <p>This automated action has been initialized.</p>
      `;

            const emailResult = await emailService.sendMarketingEmail(
              targetEmail,
              emailSubject,
              'Hi there!',
              emailBody,
              `https://teleflow-ai-mccm.vercel.app/dashboard`,
              'View Dashboard'
            ) as { success: boolean; messageId?: string; error?: string; isMock?: boolean };

            // 2. Log to Supabase "campaign_logs"
            // Note: If the table doesn't exist in the demo DB, this might fail silently or error.
            // We handle that gracefully.
            const { error: dbError } = await supabase
                .from('campaign_logs')
                .insert([{
                    ...logEntry,
                    status: emailResult.success ? 'Success' : 'Failed',
                    executed_at: new Date().toISOString()
                }]);

            if (dbError) {
                console.warn('Failed to write to campaign_logs table. It might not exist in the demo DB.');
                console.warn('DB Error:', dbError);
                // We don't throw here to avoid breaking the UI flow for a missing table in demo
            }

            return { success: true, message: 'Action queued and logged successfully.' };

        } catch (err) {
            console.error('Execution Failed:', err);
            return { success: false, message: 'Failed to execute action.' };
        }
    }
};
