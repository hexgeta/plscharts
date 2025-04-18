import React from 'react';
import UKMarginalTaxRateChart from '@/components/uktax';
import PortugalTaxRateChart from '@/components/portugaltax';
import JapaneseTaxRateChart from '@/components/japantax';

const UKTax = () => {
  return (
    <div className="p-4">
          <h1 className="text-white text-2xl font-bold mt-20 mb-8 text-center">🇬🇧 UK tax</h1>
      <UKMarginalTaxRateChart/>
      <h1 className="text-white text-2xl font-bold mt-20 mb-8 text-center">🇵🇹 PT tax</h1>
      <PortugalTaxRateChart/>
      <h1 className="text-white text-2xl font-bold mt-20 mb-8 text-center">🇯🇵 JP tax</h1>
      <JapaneseTaxRateChart/>
    </div>
  );
};

export default UKTax;
