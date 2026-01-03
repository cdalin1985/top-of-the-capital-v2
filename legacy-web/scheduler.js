const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Twilio (commented out for now)
// const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const senderEmail = process.env.SENDER_EMAIL;

async function sendReminder(match, reminderType) {
    const isDayReminder = reminderType === 'day';
    const reminderText = isDayReminder 
        ? `Reminder: Your match vs ${match.opponentName} is scheduled for ${new Date(match.scheduled_time).toLocaleString()} at ${match.venue}.`
        : `Urgent Reminder: Your match vs ${match.opponentName} starts in less than an hour at ${match.venue}.`;

    const emailSubject = isDayReminder
        ? `Match Reminder: Top of the Capital - ${match.challenger_name} vs ${match.target_name}`
        : `Final Match Reminder: Top of the Capital - ${match.challenger_name} vs ${match.target_name}`;

    // Fetch player profiles to get contact info
    const { data: challengerProfile, error: challengerError } = await supabase
        .from('profiles')
        .select('phone_number, email')
        .eq('id', match.challenger_id)
        .single();

    const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('phone_number, email')
        .eq('id', match.target_id)
        .single();

    if (challengerError || targetError) {
        console.error('Error fetching player profiles for reminders:', challengerError || targetError);
        return;
    }

    // Send to Challenger
    if (challengerProfile) {
        // SMS (commented out for now)
        /*
        if (challengerProfile.phone_number) {
            try {
                await twilioClient.messages.create({
                    body: reminderText,
                    from: twilioPhoneNumber,
                    to: challengerProfile.phone_number
                });
                console.log(`SMS ${reminderType} sent to ${challengerProfile.email}`);
            } catch (e) {
                console.error(`Error sending SMS ${reminderType} to challenger ${challengerProfile.email}:`, e);
            }
        }
        */
        // Email
        if (challengerProfile.email) {
            try {
                await sgMail.send({
                    to: challengerProfile.email,
                    from: senderEmail,
                    subject: emailSubject,
                    html: `<p>${reminderText}</p><p>Good luck!</p>`
                });
                console.log(`Email ${reminderType} sent to ${challengerProfile.email}`);
            } catch (e) {
                console.error(`Error sending Email ${reminderType} to challenger ${challengerProfile.email}:`, e);
            }
        }
    }

    // Send to Target
    if (targetProfile) {
        // SMS (commented out for now)
        /*
        if (targetProfile.phone_number) {
            try {
                await twilioClient.messages.create({
                    body: reminderText,
                    from: twilioPhoneNumber,
                    to: targetProfile.phone_number
                });
                console.log(`SMS ${reminderType} sent to ${targetProfile.email}`);
            } catch (e) {
                console.error(`Error sending SMS ${reminderType} to target ${targetProfile.email}:`, e);
            }
        }
        */
        // Email
        if (targetProfile.email) {
            try {
                await sgMail.send({
                    to: targetProfile.email,
                    from: senderEmail,
                    subject: emailSubject,
                    html: `<p>${reminderText}</p><p>Good luck!</p>`
                });
                console.log(`Email ${reminderType} sent to ${targetProfile.email}`);
            } catch (e) {
                console.error(`Error sending Email ${reminderType} to target ${targetProfile.email}:`, e);
            }
        }
    }

    // Mark reminder as sent in DB
    const updateColumn = isDayReminder ? 'day_reminder_sent' : 'hour_reminder_sent';
    await supabase.from('matches').update({ [updateColumn]: true }).eq('id', match.id);
}

// Schedule the cron job to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('Running match reminder scheduler...');
    const now = new Date();

    // Fetch scheduled matches that haven't started and reminders haven't been sent
    const { data: upcomingMatches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'scheduled');

    if (error) {
        console.error('Error fetching upcoming matches:', error);
        return;
    }

    for (const match of upcomingMatches) {
        const scheduledTime = new Date(match.proposal ? JSON.parse(match.proposal).time : match.created_at);
        const timeDiffMs = scheduledTime.getTime() - now.getTime();
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

        // 24-hour reminder
        if (timeDiffHours > 23 && timeDiffHours <= 24 && !match.day_reminder_sent) {
            await sendReminder(match, 'day');
        }

        // 1-hour reminder
        if (timeDiffHours > 0 && timeDiffHours <= 1 && !match.hour_reminder_sent) {
            await sendReminder(match, 'hour');
        }
    }
});

console.log('Match reminder scheduler initialized.');

// Export to be imported and started by server.js
module.exports = cron;