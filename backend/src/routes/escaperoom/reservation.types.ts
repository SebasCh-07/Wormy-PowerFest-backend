export interface CreateReservationDto {
  userId: string;
  timeslotId: string;
}

export interface ResendQRDto {
  email: string;
  newEmail?: string;
  newWhatsapp?: string;
  newPartnerEmail?: string;
  newPartnerWhatsapp?: string;
  newTimeslotId?: string;
}
