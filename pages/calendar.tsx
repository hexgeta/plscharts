import React from 'react';
import Calendar from '../components/Calendar';

const CalendarPage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Calendar</h1>
      <p className="text-white/60 text-center">
A summary of upcoming KEY events in the Maximus ecosystem. All dates are at 00:00 UTC (so the morning of the date you see).</p>
      <Calendar/>
    </div>
  );
};

export default CalendarPage; 