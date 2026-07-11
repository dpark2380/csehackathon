import re

from bs4 import BeautifulSoup


def parse(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    results: list[dict] = []
    for row in soup.select(".order-item"):
        img = row.select_one(".item-image")
        title_el = row.select_one(".item-title")
        price_el = row.select_one(".item-price")
        date_el = row.select_one(".order-date")
        if not (img and title_el and price_el and date_el):
            continue
        price_match = re.search(r"[\d,]+\.?\d*", price_el.get_text())
        date_match = re.search(r"\d{4}-\d{2}-\d{2}", date_el.get_text())
        if not (price_match and date_match and img.get("src")):
            continue
        results.append(
            {
                "image_url": img["src"],
                "title": title_el.get_text(strip=True),
                "price": float(price_match.group().replace(",", "")),
                "purchase_date": date_match.group(),
                "retailer": "shein",
            }
        )
    return results
