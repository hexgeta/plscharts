import React from 'react';

interface CalendarEvent {
  eventDateUK: string;
  eventDateUS: string;
  year: number;
  token: string;
  event: string;
  reloadPhaseDays: string | number;
  reStakeDateUK: string;
  reStakeDateUS: string;
}

const calendarData: CalendarEvent[] = [
  { eventDateUK: "01/05/2022", eventDateUS: "05/01/2022", year: 0, token: "Ⓜ️", event: "Maxi start", reloadPhaseDays: "-", reStakeDateUK: "-", reStakeDateUS: "-" },
  { eventDateUK: "27/09/2022", eventDateUS: "09/27/2022", year: 0, token: "🟠", event: "Base start", reloadPhaseDays: "-", reStakeDateUK: "-", reStakeDateUS: "-" },
  { eventDateUK: "27/09/2022", eventDateUS: "09/27/2022", year: 0, token: "🎲", event: "Trio start", reloadPhaseDays: "-", reStakeDateUK: "-", reStakeDateUS: "-" },
  { eventDateUK: "27/09/2022", eventDateUS: "09/27/2022", year: 0, token: "🍀", event: "Lucky start", reloadPhaseDays: "-", reStakeDateUK: "-", reStakeDateUS: "-" },
  { eventDateUK: "27/09/2022", eventDateUS: "09/27/2022", year: 0, token: "🛡️", event: "Deci start", reloadPhaseDays: "-", reStakeDateUK: "-", reStakeDateUS: "-" },
  { eventDateUK: "01/10/2023", eventDateUS: "10/01/2023", year: 1, token: "🟠", event: "Base (Period 1 end)", reloadPhaseDays: "7", reStakeDateUK: "10/10/2023", reStakeDateUS: "10/10/2023" },
  { eventDateUK: "13/10/2024", eventDateUS: "10/13/2024", year: 2, token: "🟠", event: "Base (Period 2 end)", reloadPhaseDays: "7", reStakeDateUK: "22/10/2024", reStakeDateUS: "10/22/2024" },
  { eventDateUK: "12/10/2025", eventDateUS: "10/12/2025", year: 3, token: "🎲", event: "Trio (Period 1 end)", reloadPhaseDays: "7", reStakeDateUK: "21/10/2025", reStakeDateUS: "10/21/2025" },
  { eventDateUK: "26/10/2025", eventDateUS: "10/26/2025", year: 3, token: "🟠", event: "Base (Period 3 end)", reloadPhaseDays: "7", reStakeDateUK: "04/11/2025", reStakeDateUS: "11/04/2025" },
  { eventDateUK: "08/11/2026", eventDateUS: "11/08/2026", year: 4, token: "🟠", event: "Base (Period 4 end)", reloadPhaseDays: "7", reStakeDateUK: "17/11/2026", reStakeDateUS: "11/17/2026" },
  { eventDateUK: "21/11/2027", eventDateUS: "11/21/2027", year: 5, token: "🟠", event: "Base (Period 5 end)", reloadPhaseDays: "7", reStakeDateUK: "30/11/2027", reStakeDateUS: "11/30/2027" },
  { eventDateUK: "05/11/2028", eventDateUS: "11/05/2028", year: 6, token: "🎲", event: "Trio (Period 2 end)", reloadPhaseDays: "7", reStakeDateUK: "14/11/2028", reStakeDateUS: "11/14/2028" },
  { eventDateUK: "03/12/2028", eventDateUS: "12/03/2028", year: 6, token: "🟠", event: "Base (Period 6 end)", reloadPhaseDays: "7", reStakeDateUK: "12/12/2028", reStakeDateUS: "12/12/2028" },
  { eventDateUK: "25/09/2029", eventDateUS: "09/25/2029", year: 7, token: "🍀", event: "Lucky (Period 1 end)", reloadPhaseDays: "14", reStakeDateUK: "11/10/2029", reStakeDateUS: "10/11/2029" },
  { eventDateUK: "16/12/2029", eventDateUS: "12/16/2029", year: 7, token: "🟠", event: "Base (Period 7 end)", reloadPhaseDays: "7", reStakeDateUK: "25/12/2029", reStakeDateUS: "12/25/2029" },
  { eventDateUK: "29/12/2030", eventDateUS: "12/29/2030", year: 8, token: "🟠", event: "Base (Period 8 end)", reloadPhaseDays: "7", reStakeDateUK: "07/01/2031", reStakeDateUS: "01/07/2031" },
  { eventDateUK: "30/11/2031", eventDateUS: "11/30/2031", year: 9, token: "🎲", event: "Trio (Period 3 end)", reloadPhaseDays: "7", reStakeDateUK: "09/12/2031", reStakeDateUS: "12/09/2031" },
  { eventDateUK: "11/01/2032", eventDateUS: "01/11/2032", year: 9, token: "🟠", event: "Base (Period 9 end)", reloadPhaseDays: "7", reStakeDateUK: "20/01/2032", reStakeDateUS: "01/20/2032" },
  { eventDateUK: "09/11/2032", eventDateUS: "11/09/2032", year: 10, token: "🛡️", event: "Deci (Period 1 end)", reloadPhaseDays: "14", reStakeDateUK: "25/11/2032", reStakeDateUS: "11/25/2032" },
  { eventDateUK: "23/01/2033", eventDateUS: "01/23/2033", year: 10, token: "🟠", event: "Base (Period 10 end)", reloadPhaseDays: "7", reStakeDateUK: "01/02/2033", reStakeDateUS: "02/01/2033" },
  { eventDateUK: "05/02/2034", eventDateUS: "02/05/2034", year: 11, token: "🟠", event: "Base (Period 11 end)", reloadPhaseDays: "7", reStakeDateUK: "14/02/2034", reStakeDateUS: "02/14/2034" },
  { eventDateUK: "24/12/2034", eventDateUS: "12/24/2034", year: 12, token: "🎲", event: "Trio (Period 4 end)", reloadPhaseDays: "7", reStakeDateUK: "02/01/2035", reStakeDateUS: "01/02/2035" },
  { eventDateUK: "18/02/2035", eventDateUS: "02/18/2035", year: 12, token: "🟠", event: "Base (Period 12 end)", reloadPhaseDays: "7", reStakeDateUK: "27/02/2035", reStakeDateUS: "02/27/2035" },
  { eventDateUK: "02/03/2036", eventDateUS: "03/02/2036", year: 13, token: "🟠", event: "Base (Period 13 end)", reloadPhaseDays: "7", reStakeDateUK: "11/03/2036", reStakeDateUS: "03/11/2036" },
  { eventDateUK: "09/10/2036", eventDateUS: "10/09/2036", year: 14, token: "🍀", event: "Lucky (Period 2 end)", reloadPhaseDays: "14", reStakeDateUK: "25/10/2036", reStakeDateUS: "10/25/2036" },
  { eventDateUK: "15/03/2037", eventDateUS: "03/15/2037", year: 14, token: "🟠", event: "Base (Period 14 end)", reloadPhaseDays: "7", reStakeDateUK: "24/03/2037", reStakeDateUS: "03/24/2037" },
  { eventDateUK: "16/07/2037", eventDateUS: "07/16/2037", year: 15, token: "Ⓜ️", event: "Maxi end", reloadPhaseDays: "-", reStakeDateUK: "16/07/2037", reStakeDateUS: "-" }
];

const Calendar: React.FC = () => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="max-w-[1200px] mx-auto p-8">
        <div className="bg-[#111111] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.2)]">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Event date (UK)</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Event date (US)</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Year</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Token</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Event</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Reload phase days</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Re-stake date (UK)</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Re-stake date (US)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {calendarData.map((event, index) => (
                <tr 
                  key={index}
                  className={`${index % 2 === 0 ? 'bg-[#000]' : 'bg-[#111111]'} hover:bg-[#222222] transition-colors`}
                >
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.eventDateUK}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.eventDateUS}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.year}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">{event.token}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.event}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.reloadPhaseDays}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.reStakeDateUK}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-300">{event.reStakeDateUS}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-sm text-gray-400">
          <p className="font-semibold mb-2">NOTES:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The reload phases for Lucky & Deci are 14 days long.</li>
            <li>Maxi does not have a reload phase. When it ends the HEX just sits there waiting to be claimed.</li>
            <li>Event dates on PulseChain are identical apart from Base (need to check that).</li>
          </ul>
          <p className="mt-4">To the best of my knowledge, these dates are accurate. Please do not blindly add them to your calendar.</p>
          <p className="mt-2">It's your responsibility to confirm the dates on the blockchain directly or from other sources leading up to the reload phases you wish to participate in.</p>
        </div>
      </div>
    </div>
  );
};

export default Calendar; 