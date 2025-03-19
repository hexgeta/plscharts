import React from 'react';
import ProjectionChartMAXI from '../components/ProjectionChartMAXI';
import ProjectionChartMAXI2 from '../components/ProjectionChartMAXI2';
import ProjectionChartDECI from '../components/ProjectionChartDECI';
import ProjectionChartLUCKY from '../components/ProjectionChartLUCKY';
import ProjectionChartTRIO from '../components/ProjectionChartTRIO';
import ProjectionChartBASE from '../components/ProjectionChartBASE';  

const ProjectionsPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Projection Charts</h1>
      <p className="text-white/60 text-center">
        These projection charts plot historic market price against the value of the underlying HEX stake. It includes projections of these values into the future via multiple trend lines. They serve as useful models to illustrate how the value of these tokens may behave throughout the length of their HEX stakes.
      </p>
      <div>
        <ProjectionChartMAXI/>
        <ProjectionChartMAXI2/>
        <ProjectionChartDECI/>
        <ProjectionChartLUCKY/>
        <ProjectionChartTRIO/>
        <ProjectionChartBASE/>
      </div>
    </div>
  );
};

export default ProjectionsPage;