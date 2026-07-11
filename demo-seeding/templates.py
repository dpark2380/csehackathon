def render_shein(item: dict) -> str:
    return f"""<html><body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#000000;padding:20px;text-align:center;">
    <span style="color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:2px;">SHEIN</span>
  </div>
  <div style="padding:20px;">
    <h2 style="color:#333333;">Thank you for your order!</h2>
    <p class="order-number">Order Number: {item["order_number"]}</p>
    <p class="order-date">Order Date: {item["order_date"]}</p>
    <table class="order-item" width="100%" cellpadding="10" style="border:1px solid #eeeeee;margin-top:16px;">
      <tr>
        <td width="120"><img class="item-image" src="{item["image_url"]}" width="100" alt="{item["title"]}" /></td>
        <td>
          <div class="item-title">{item["title"]}</div>
          <div class="item-price">A${item["price"]:.2f}</div>
          <div class="order-date">Purchased: {item["order_date"]}</div>
        </td>
      </tr>
    </table>
    <table width="100%" style="margin-top:16px;border-top:1px solid #eeeeee;padding-top:10px;">
      <tr><td>Subtotal</td><td align="right">A${item["price"]:.2f}</td></tr>
      <tr><td>Shipping</td><td align="right">A$0.00</td></tr>
      <tr><td><b>Total</b></td><td align="right"><b>A${item["price"]:.2f}</b></td></tr>
    </table>
  </div>
  <div style="background:#f0f0f0;padding:16px;text-align:center;color:#888888;font-size:12px;">
    SHEIN &middot; This is an automated order confirmation. Do not reply.
  </div>
</div>
</body></html>"""


def render_amazon(item: dict) -> str:
    return f"""<html><body style="margin:0;font-family:Arial,sans-serif;background:#eaeded;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#131921;padding:16px 20px;">
    <span style="color:#ffffff;font-size:20px;font-weight:bold;">amazon<span style="color:#ff9900;">.com.au</span></span>
  </div>
  <div style="padding:20px;">
    <h2 style="color:#0f1111;">Order Confirmation</h2>
    <p class="order-number">Order #{item["order_number"]}</p>
    <p class="order-date">Order placed: {item["order_date"]}</p>
    <table class="order-item" width="100%" cellpadding="10" style="border:1px solid #dddddd;margin-top:16px;">
      <tr>
        <td width="120"><img class="item-image" src="{item["image_url"]}" width="100" alt="{item["title"]}" /></td>
        <td>
          <div class="item-title">{item["title"]}</div>
          <div class="item-price">${item["price"]:.2f} AUD</div>
          <div class="order-date">Ordered on {item["order_date"]}</div>
        </td>
      </tr>
    </table>
    <table width="100%" style="margin-top:16px;border-top:1px solid #dddddd;padding-top:10px;">
      <tr><td>Item(s) Subtotal</td><td align="right">${item["price"]:.2f}</td></tr>
      <tr><td>Shipping</td><td align="right">$0.00</td></tr>
      <tr><td><b>Order Total</b></td><td align="right"><b>${item["price"]:.2f}</b></td></tr>
    </table>
  </div>
  <div style="background:#f7f7f7;padding:16px;text-align:center;color:#767676;font-size:12px;">
    Amazon.com.au &middot; Please do not reply to this automated confirmation.
  </div>
</div>
</body></html>"""
