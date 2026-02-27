// Note: This would typically be handled by a Cloud Function
// This is a client-side simulation

export const sendEmailNotification = async (to, subject, body) => {
  // In production, this should call a Firebase Cloud Function
  console.log('Sending email:', { to, subject, body });
  
  // For demo purposes only
  return {
    success: true,
    message: 'Email sent (simulated)'
  };
};

export const sendLateNotification = async (teacherEmail, teacherName, minutes) => {
  const subject = 'Late Arrival Notification';
  const body = `
    Dear ${teacherName},
    
    This is to notify you that you were marked LATE today by ${minutes} minutes.
    
    Please ensure to arrive on time as per the schedule.
    
    Regards,
    Admin Team
  `;
  
  return sendEmailNotification(teacherEmail, subject, body);
};

export const sendAbsentNotification = async (teacherEmail, teacherName) => {
  const subject = 'Absent Notification';
  const body = `
    Dear ${teacherName},
    
    You have been marked ABSENT for today.
    
    If this was a planned leave, please ensure it's recorded in the system.
    
    Regards,
    Admin Team
  `;
  
  return sendEmailNotification(teacherEmail, subject, body);
};