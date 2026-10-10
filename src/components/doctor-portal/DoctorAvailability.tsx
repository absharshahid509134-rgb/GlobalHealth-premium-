import React from 'react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorAvailability: React.FC = () => (
  <DoctorUnavailable
    title="Availability unavailable"
    message="Scheduling and availability are not connected to an authorized booking service for this Doctor Portal session."
    scope="No working hours, appointment slots, or facility affiliations are created in the browser."
  />
);
