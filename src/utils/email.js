const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Default to SMTP
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Send order confirmation email
exports.sendOrderConfirmation = async (order) => {
  try {
    const transporter = createTransporter();

    const items = typeof order.items === 'string' 
      ? JSON.parse(order.items) 
      : order.items;

    const itemsList = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          $${(item.price * (item.quantity || 1)).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          .total-row { font-weight: bold; font-size: 1.2em; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Order! 🙏</h1>
            <p>Order #${order.order_number}</p>
          </div>
          
          <div class="content">
            <p>Dear ${order.customer_name},</p>
            
            <p>We've received your order and are excited to get your scripture bracelets and greeting cards to you!</p>
            
            <div class="order-details">
              <h2>Order Details</h2>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 10px; border-bottom: 2px solid #9333ea;">Item</th>
                    <th style="text-align: right; padding: 10px; border-bottom: 2px solid #9333ea;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                  ${order.discount_amount > 0 ? `
                    <tr>
                      <td style="padding: 10px; color: #16a34a;">
                        Discount (${order.discount_code})
                      </td>
                      <td style="padding: 10px; text-align: right; color: #16a34a;">
                        -$${parseFloat(order.discount_amount).toFixed(2)}
                      </td>
                    </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td style="padding: 15px 10px;">Total</td>
                    <td style="padding: 15px 10px; text-align: right;">$${parseFloat(order.total).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Your order is being processed</li>
              <li>You'll receive a shipping confirmation email with tracking information</li>
              <li>Estimated delivery: 5-7 business days</li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to reach out to us.</p>
            
            <p style="margin-top: 30px;">
              <em>"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." - Jeremiah 29:11</em>
            </p>
            
            <p>Blessings,<br>The OurDailyScripture Team</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} OurDailyScripture. All rights reserved.</p>
            <p>
              <a href="https://ourdailyscripture.com" style="color: #9333ea;">Visit our website</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `OurDailyScripture <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: order.customer_email,
      subject: `Order Confirmation - ${order.order_number}`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${order.customer_email}`);
    
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send admin notification email
exports.sendAdminNotification = async (order) => {
  try {
    const transporter = createTransporter();

    const emailHtml = `
      <h2>New Order Received!</h2>
      <p><strong>Order Number:</strong> ${order.order_number}</p>
      <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_email})</p>
      <p><strong>Total:</strong> $${parseFloat(order.total).toFixed(2)}</p>
      ${order.discount_code ? `<p><strong>Discount Code:</strong> ${order.discount_code}</p>` : ''}
      <p><a href="${process.env.ADMIN_URL}/orders/${order.id}">View Order Details</a></p>
    `;

    const mailOptions = {
      from: `OurDailyScripture <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Order: ${order.order_number}`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification email sent`);
    
    return true;
  } catch (error) {
    console.error('Admin email error:', error);
    // Don't throw - admin notification failure shouldn't break the order
    return false;
  }
};

