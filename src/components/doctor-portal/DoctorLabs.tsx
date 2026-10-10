import React from 'react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorLabs: React.FC = () => (
  <DoctorUnavailable
    title="Laboratory workflow unavailable"
    message="No verified LIS or laboratory integration is connected for this Doctor Portal session."
    scope="Lab orders and review acknowledgements are blocked; no local order or result is created."
  />
);
