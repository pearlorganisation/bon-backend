export const sendBookingConfirmationEmail = async (booking) => {
  const brandColor = "#f05a28";
  
  // Extracting details from your schema
  const guestName = booking.primaryGuestDetails.fullName;
  const guestEmail = booking.primaryGuestDetails.email;
  const partnerEmail = booking.propertyId.ownerEmail; // Ensure Property schema has this
  const checkIn = new Date(booking.checkInDate).toDateString();
  const checkOut = new Date(booking.checkOutDate).toDateString();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #fff; padding: 20px; text-align: center; border-bottom: 4px solid ${brandColor};">
        <img src="https://bonfireescapes.com/logoo.jpeg" alt="Bonfire Escapes" style="width: 150px;">
      </div>
      
      <div style="padding: 30px;">
        <h2 style="color: #333;">Booking ${booking.status === 'confirmed' ? 'Confirmed!' : 'Received'}</h2>
        <p>Hello,</p>
        <p>A new booking has been processed at <strong>Bonfire Escapes</strong>.</p>
        
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
          <h3 style="margin-top:0;">Booking Details</h3>
          <p><strong>Confirmation Code:</strong> ${booking.confirmationCode}</p>
          <p><strong>Property:</strong> ${booking.propertyId.name}</p>
          <p><strong>Guest:</strong> ${guestName}</p>
          <p><strong>Check-in:</strong> ${checkIn}</p>
          <p><strong>Check-out:</strong> ${checkOut}</p>
          <p><strong>Total Paid:</strong> ₹${booking.totalPrice}</p>
        </div>

        <p>If you have any questions, contact us at <a href="mailto:support@bonfireescapes.com">support@bonfireescapes.com</a></p>
      </div>
    </div>
  `;

  // Send to Guest
  await sendEmail(guestEmail, "Booking Confirmation - Bonfire Escapes", html);

  // Send to Partner (Owner)
  if (partnerEmail) {
    await sendEmail(partnerEmail, "New Booking Received - Bonfire Escapes", html);
  }
};