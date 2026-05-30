import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models

# Standard mock data sources to avoid external dependencies like Faker
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
    "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Christopher", "Lisa", "Matthew", "Nancy", "Daniel", "Betty", "Mark", "Sandra", "Donald", "Margaret",
    "Steven", "Ashley", "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna", "Kenneth", "Michelle",
    "Kevin", "Carol", "Brian", "Amanda", "George", "Dorothy", "Timothy", "Melissa", "Ronald", "Deborah"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
]

CITIES_STATES = [
    ("New York", "NY", "East"), ("Buffalo", "NY", "East"),
    ("Los Angeles", "CA", "West"), ("San Francisco", "CA", "West"), ("San Diego", "CA", "West"),
    ("Houston", "TX", "South"), ("Austin", "TX", "South"), ("Dallas", "TX", "South"),
    ("Miami", "FL", "South"), ("Orlando", "FL", "South"), ("Tampa", "FL", "South"),
    ("Seattle", "WA", "West"), ("Spokane", "WA", "West"),
    ("Chicago", "IL", "North"), ("Springfield", "IL", "North"),
    ("Boston", "MA", "East"), ("Worcester", "MA", "East"),
    ("Atlanta", "GA", "South"), ("Savannah", "GA", "South"),
    ("Denver", "CO", "West"), ("Boulder", "CO", "West"),
    ("Philadelphia", "PA", "East"), ("Pittsburgh", "PA", "East"),
    ("Phoenix", "AZ", "West"), ("Tucson", "AZ", "West"),
    ("Detroit", "MI", "North"), ("Grand Rapids", "MI", "North")
]

DEPARTMENTS = ["Sales", "Marketing", "Engineering", "Finance", "Human Resources", "Customer Support"]
LOCATIONS = ["New York, NY", "San Francisco, CA", "Austin, TX", "Chicago, IL", "Atlanta, GA", "Seattle, WA"]

PRODUCT_CATEGORIES = {
    "Electronics": [
        ("Smart Phone Pro", 999.99), ("Noise Cancelling Headphones", 299.99),
        ("4K Ultra HD Monitor", 349.99), ("Mechanical Keyboard", 129.99),
        ("Wireless Gaming Mouse", 79.99), ("Smart Watch Series 5", 249.99),
        ("USB-C Hub Multiport", 49.99), ("Bluetooth Speaker Portable", 89.99),
        ("HD Webcam 1080p", 69.99), ("External SSD 1TB", 119.99),
        ("Wireless Charger Pad", 29.99), ("Tablet Air 10-inch", 499.99),
        ("Laptop Pro 15-inch", 1499.99), ("Smart Home Security Camera", 159.99),
        ("VR Headset Starter Kit", 399.99)
    ],
    "Apparel": [
        ("Classic Fit Denim Jeans", 59.99), ("Crewneck Cotton T-Shirt", 19.99),
        ("Hooded Fleece Sweatshirt", 44.99), ("Waterproof Windbreaker", 89.99),
        ("Running Athletic Shoes", 110.00), ("Leather Chelsea Boots", 140.00),
        ("Wool Blend Winter Coat", 199.99), ("Activewear Leggings", 39.99),
        ("Silk Necktie", 34.99), ("Leather Dress Belt", 29.99),
        ("Puffer Winter Jacket", 120.00), ("Summer Cotton Dress", 49.99),
        ("Polarized Sunglasses", 75.00), ("Canvas Travel Backpack", 65.00),
        ("Warm Merino Wool Socks", 14.99)
    ],
    "Home & Kitchen": [
        ("12-Cup Programmable Coffee Maker", 79.99), ("Stainless Steel Electric Kettle", 39.99),
        ("Professional Blender 1000W", 129.99), ("Non-Stick Cookware Set 10pc", 189.99),
        ("Robot Vacuum Cleaner", 249.99), ("Digital Kitchen Scale", 19.99),
        ("Memory Foam Pillow Standard", 34.99), ("Air Purifier for Allergies", 149.99),
        ("Cast Iron Dutch Oven 5qt", 79.99), ("Chef Knife 8-inch", 49.99),
        ("Insulated Coffee Mug", 24.99), ("Slow Cooker 6-quart", 59.99),
        ("Toaster Oven 4-Slice", 69.99), ("Handheld Garment Steamer", 34.99),
        ("Organizing Storage Baskets", 29.99)
    ],
    "Sports & Outdoors": [
        ("Eco-Friendly Yoga Mat", 39.99), ("Adjustable Dumbbell Pair", 220.00),
        ("Waterproof Camping Tent 4-Person", 149.99), ("Sleeping Bag 3-Season", 59.99),
        ("Stainless Steel Water Bottle", 24.99), ("Mountain Bike 24-Speed", 450.00),
        ("Hiking Backpack 50L", 89.99), ("Trekking Poles Collapsible", 44.99),
        ("Resistance Bands Set", 19.99), ("Pickleball Paddle Set", 69.99),
        ("Inflatable Stand Up Paddleboard", 320.00), ("Portable Camping Grill", 79.99),
        ("Snorkel and Mask Set", 34.99), ("LED Headlamp Rechargeable", 19.99),
        ("Folding Camping Chair", 29.99)
    ],
    "Books": [
        ("The Tech Revolution", 14.99), ("AI Ethics and Society", 24.99),
        ("Data Science Handbook", 39.99), ("Classic Fiction Collection", 18.99),
        ("The Art of Cooking", 29.99), ("Healthy Habits Daily", 12.99),
        ("Business Strategy 101", 19.99), ("World History Volume 1", 27.99),
        ("Mystery of the Red Room", 9.99), ("Children's Picture Book", 8.99),
        ("Introduction to Economics", 34.99), ("Creative Writing Manual", 15.99),
        ("The Leadership Mindset", 21.99), ("Personal Finance Made Simple", 17.99),
        ("Space Exploration Science", 22.99)
    ],
    "Office Supplies": [
        ("Ergonomic Mesh Office Chair", 199.99), ("Dual Monitor Stand", 59.99),
        ("Dry Erase Whiteboard 3x4", 45.00), ("Gel Pens Assorted 12-Pack", 12.99),
        ("Ruled Notebook 3-Pack", 14.99), ("Heavy Duty Desktop Stapler", 18.99),
        ("File Folders Letter Size 100ct", 15.99), ("Desk Organizer Caddy", 14.99),
        ("Paper Shredder Cross-Cut", 69.99), ("Laminating Machine", 39.99)
    ]
}

PAYMENT_METHODS = ["Credit Card", "PayPal", "Debit Card", "Bank Transfer", "Apple Pay"]

def generate_db_data(db: Session):
    # Check if database is already seeded
    if db.query(models.Customer).count() > 0:
        print("Database already contains data. Skipping seeding.")
        return

    print("Seeding database...")
    
    # 1. Generate Products
    products = []
    product_idx = 1
    for category, item_list in PRODUCT_CATEGORIES.items():
        for name, price in item_list:
            product = models.Product(
                product_id=product_idx,
                product_name=name,
                category=category,
                price=price
            )
            db.add(product)
            products.append(product)
            product_idx += 1
            
    # Add filler products to make exactly 100
    while len(products) < 100:
        cat = random.choice(list(PRODUCT_CATEGORIES.keys()))
        base_item = random.choice(PRODUCT_CATEGORIES[cat])
        name = f"{base_item[0]} Deluxe v{random.randint(2, 5)}"
        price = round(base_item[1] * random.uniform(1.1, 1.4), 2)
        product = models.Product(
            product_id=product_idx,
            product_name=name,
            category=cat,
            price=price
        )
        db.add(product)
        products.append(product)
        product_idx += 1
        
    db.commit()
    print(f"Seeded {len(products)} products.")

    # 2. Generate Customers
    customers = []
    random.seed(42)  # For deterministic email uniqueness & names
    emails_seen = set()
    
    start_date = datetime.now() - timedelta(days=730)  # Last 2 years
    
    for i in range(1, 1001):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        
        email = f"{first.lower()}.{last.lower()}{i}@example.com"
        while email in emails_seen:
            email = f"{first.lower()}.{last.lower()}{i}{random.randint(1,99)}@example.com"
        emails_seen.add(email)
        
        city, state, region = random.choice(CITIES_STATES)
        
        # Registration date spread over the last 2 years
        reg_days = random.randint(0, 700)
        registration_date = (start_date + timedelta(days=reg_days)).date()
        
        customer = models.Customer(
            customer_id=i,
            name=name,
            email=email,
            city=city,
            state=state,
            registration_date=registration_date
        )
        db.add(customer)
        customers.append(customer)
        
    db.commit()
    print(f"Seeded {len(customers)} customers.")

    # 3. Generate Employees
    employees = []
    for i in range(1, 101):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        emp_name = f"{first} {last}"
        
        employee = models.Employee(
            employee_id=i,
            employee_name=emp_name,
            department=random.choice(DEPARTMENTS),
            location=random.choice(LOCATIONS)
        )
        db.add(employee)
        employees.append(employee)
        
    db.commit()
    print(f"Seeded {len(employees)} employees.")

    # 4. Generate Orders & Payments
    # Generate 10,000 orders
    orders = []
    payments = []
    
    # We want orders to be distributed chronologically, matching customer registrations
    customers.sort(key=lambda c: c.registration_date)
    
    print("Generating 10,000 orders and payments...")
    
    # Pre-fetch products to avoid queries inside loop
    products_db = db.query(models.Product).all()
    
    current_date = datetime.now().date()
    
    for o_id in range(1, 10001):
        # Pick customer, weighted towards customers registered earlier (more ordering time)
        # Or simple: pick a customer, ensure order_date >= customer.registration_date
        customer = random.choice(customers)
        product = random.choice(products_db)
        
        # Calculate possible order dates: customer registration to today
        days_range = (current_date - customer.registration_date).days
        if days_range <= 0:
            order_date = customer.registration_date
        else:
            order_days = random.randint(0, days_range)
            order_date = customer.registration_date + timedelta(days=order_days)
            
        quantity = random.randint(1, 5)
        
        # Region matches the city/state region or a random region?
        # Let's map it to the customer's state region to make the demographics realistic!
        # Find region from CITIES_STATES
        region = "North"
        for city, state, reg in CITIES_STATES:
            if state == customer.state:
                region = reg
                break
                
        order = models.Order(
            order_id=o_id,
            customer_id=customer.customer_id,
            product_id=product.product_id,
            quantity=quantity,
            order_date=order_date,
            region=region
        )
        db.add(order)
        
        # Generate Payment for this order
        pay_amount = round(quantity * product.price, 2)
        # Payment date is usually order date or 1 day later
        pay_delay = random.choice([0, 0, 0, 1])  # 75% same day, 25% next day
        pay_date = order_date + timedelta(days=pay_delay)
        
        payment = models.Payment(
            payment_id=o_id,  # 1-to-1 matching payment_id with order_id for simplicity
            order_id=o_id,
            amount=pay_amount,
            payment_method=random.choice(PAYMENT_METHODS),
            payment_date=pay_date
        )
        db.add(payment)
        
    db.commit()
    print("Seeded 10,000 orders and payments successfully.")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        generate_db_data(db)
    finally:
        db.close()
