import React from 'react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorBilling: React.FC = () => (
  <DoctorUnavailable
    title="Billing unavailable"
    message="No verified billing or payment service is connected for this Doctor Portal session."
    scope="Amounts, invoices, patient charges, and payment statuses are not shown or generated locally."
  />
);
