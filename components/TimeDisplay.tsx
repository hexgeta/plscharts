'use client'

import { useState, useEffect } from 'react'
import NumberFlow from '@number-flow/react'

export default function TimeDisplay() {
  const [currentDate, setCurrentDate] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
      setCurrentDate(utcNow.toISOString().slice(0, 10));
      setHours(utcNow.getUTCHours());
      setMinutes(utcNow.getUTCMinutes());
      setSeconds(utcNow.getUTCSeconds());
    }

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center ml-0">
      <p className="text-[#666] text-sm tracking-wider flex justify-center items-center gap-1">
        <span>{currentDate}</span>
        <span className="flex">
          <NumberFlow 
            value={hours}
            format={{ minimumIntegerDigits: 2 }}
            style={{ '--number-flow-char-height': '1.2em' } as React.CSSProperties}
          />
          :
          <NumberFlow 
            value={minutes}
            format={{ minimumIntegerDigits: 2 }}
            style={{ '--number-flow-char-height': '1.2em' } as React.CSSProperties}
          />
          :
          <NumberFlow 
            value={seconds}
            format={{ minimumIntegerDigits: 2 }}
            style={{ '--number-flow-char-height': '1.2em' } as React.CSSProperties}
          />
        </span>
        <span className="ml-1">UTC</span>
      </p>
    </div>
  )
} 