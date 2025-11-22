# 🏪 Retail POS System

A modern, comprehensive Point of Sale (POS) system built with **Angular 17+** and **Node.js/Express** with **MongoDB** database integration. Designed for retail stores with advanced features including barcode scanning, digital scale integration, user management, and customizable receipt printing.

## ✨ Features

### Core POS Functionality

- **🛒 Sales Processing**: Quick and efficient checkout process
- **📊 Real-time Cart Management**: Dynamic cart with quantity and discount controls
- **💰 Multiple Payment Methods**: Cash, card, transfer, and mixed payments
- **🧾 Receipt Generation**: Customizable print templates

### Product Management

- **📦 Product Catalog**: Complete CRUD operations for products
- **🏷️ Category Organization**: Multi-level category management with color coding
- **📊 Inventory Tracking**: Stock levels, low stock warnings, and alerts
- **⚖️ Weight-based Products**: Support for products sold by weight

### Advanced Features

- **📷 Barcode Scanning**:
  - Manual barcode input
  - Camera-based scanning using device camera (mobile-friendly)
  - Integration with barcode scanners
- **⚖️ Digital Scale Integration**: Web Serial API support for electronic scales
- **❌ Sale Cancellation**: Authorized refunds with reason tracking
- **💸 Discount Management**: Item-level and transaction-level discounts
- **🧾 Print Templates**: Customizable receipt layouts and formats
- **👥 User Management**: Role-based access control (Admin, Manager, Cashier, Employee)
- **🏢 Provider Management**: Supplier information and relationships
- **📈 Sales Reports**: Transaction history and analytics

### Security & Access Control

- **🔐 JWT Authentication**: Secure token-based authentication
- **👤 Role-based Permissions**: Granular permission system
- **🔒 Protected Routes**: Route guards for authorized access

## 🏗️ Architecture

### Frontend (Angular)

- **Standalone Components**: Modern Angular architecture
- **Reactive Forms**: Real-time validation and updates
- **RxJS Observables**: Efficient data streaming
- **Service-based Architecture**: Separation of concerns
- **Route Guards**: Authentication and authorization

### Backend (Node.js/Express)

- **RESTful API**: Clean API design
- **MongoDB/Mongoose**: Document-based database
- **JWT Authentication**: Secure token management
- **Middleware**: Authentication, error handling, validation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **MongoDB** (v6.x or higher) - Running locally or remotely
- **Angular CLI** (v17.x or higher): `npm install -g @angular/cli`

## 🚀 Installation

### 1. Clone or Navigate to Project

```powershell
cd c:\Users\IRWIN\Documents\pdev
```

### 2. Install Frontend Dependencies

```powershell
npm install --save @angular/animations @angular/common @angular/compiler @angular/core @angular/forms @angular/platform-browser @angular/platform-browser-dynamic @angular/router rxjs tslib zone.js
npm install --save-dev @angular-devkit/build-angular @angular/cli @angular/compiler-cli typescript
```

### 3. Install Backend Dependencies

```powershell
cd server
npm install
cd ..
```

### 4. Configure Database Connection

The MongoDB connection is already configured in `server/.env`:

```env
MONGODB_URI=mongodb://admin:productdb2025@localhost:27017/products?authSource=admin
```

Make sure your MongoDB server is running with these credentials.

### 5. Seed Initial Data (Optional)

Run this script to create initial users and sample data:

```powershell
cd server
node seed.js
cd ..
```

## 🏃 Running the Application

### Option 1: Run Frontend and Backend Separately

**Terminal 1 - Backend Server:**

```powershell
cd server
npm run dev
```

The API will run on `http://localhost:3000`

**Terminal 2 - Angular Frontend:**

```powershell
npm start
```

The application will run on `http://localhost:4200`

### Option 2: Run Both Concurrently (Recommended)

First install concurrently:

```powershell
npm install --save-dev concurrently
```

Then run:

```powershell
npm run dev
```

## 👤 Default Login Credentials

After seeding the database, use these credentials:

**Admin Account:**

- Username: `admin`
- Password: `admin123`
- Full access to all features

**Manager Account:**

- Username: `manager`
- Password: `manager123`
- Access to management features

**Cashier Account:**

- Username: `cashier`
- Password: `cashier123`
- Access to POS and sales features

## 📱 Using the Camera Scanner

### On Desktop

1. Click the "📷 Camera" button in the POS interface
2. Allow camera access when prompted
3. Point the camera at a barcode
4. The product will be automatically added to the cart

### On Mobile/Tablet

1. Open the app in a mobile browser (Chrome/Safari recommended)
2. The camera scanner works best on mobile devices
3. Use the rear camera for better barcode recognition

## ⚖️ Digital Scale Integration

The system supports digital scales via Web Serial API:

1. Connect your digital scale via USB
2. Click the "⚖️ Scale" button in POS
3. Select your scale from the device list
4. The weight will be displayed in real-time
5. Products marked "requiresScale" will use the current weight

**Supported Browsers:** Chrome, Edge (v89+)

## 🗂️ Project Structure

```
pdev/
├── src/                          # Angular frontend
│   ├── app/
│   │   ├── components/          # UI components
│   │   │   ├── login/          # Login page
│   │   │   ├── pos/            # Main POS interface
│   │   │   ├── products/       # Product management
│   │   │   ├── categories/     # Category management
│   │   │   ├── sales/          # Sales history
│   │   │   ├── users/          # User management
│   │   │   ├── providers/      # Provider management
│   │   │   ├── templates/      # Print templates
│   │   │   └── settings/       # Settings
│   │   ├── services/           # Angular services
│   │   ├── guards/             # Route guards
│   │   ├── interceptors/       # HTTP interceptors
│   │   └── models/             # TypeScript interfaces
│   ├── environments/           # Environment configs
│   └── assets/                 # Static assets
├── server/                      # Node.js backend
│   ├── config/                 # Database configuration
│   ├── models/                 # Mongoose models
│   ├── routes/                 # API routes
│   ├── middleware/             # Express middleware
│   ├── utils/                  # Utility functions
│   └── index.js               # Server entry point
└── README.md
```

## 🔧 Configuration

### Environment Variables (server/.env)

```env
PORT=3000
MONGODB_URI=mongodb://admin:productdb2025@localhost:27017/products?authSource=admin
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

### Angular Environment (src/environments/)

**Development (environment.ts):**

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api",
};
```

**Production (environment.prod.ts):**

```typescript
export const environment = {
  production: true,
  apiUrl: "/api",
};
```

## 📡 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/barcode/:barcode` - Get product by barcode
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Sales

- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale by ID
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id/cancel` - Cancel sale
- `GET /api/sales/reports/summary` - Get sales summary

### Users

- `GET /api/users` - Get all users (Admin/Manager)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Providers

- `GET /api/providers` - Get all providers
- `POST /api/providers` - Create provider
- `PUT /api/providers/:id` - Update provider
- `DELETE /api/providers/:id` - Delete provider

### Print Templates

- `GET /api/templates` - Get all templates
- `GET /api/templates/default` - Get default template
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

## 🔐 Permissions System

### Roles

- **admin**: Full system access
- **manager**: Management and reporting access
- **cashier**: POS and basic sales access
- **employee**: Limited access

### Permissions

- `sales` - Process sales transactions
- `refunds` - Cancel/refund sales
- `discounts` - Apply discounts
- `reports` - View reports
- `inventory` - Manage products/categories
- `users` - Manage users
- `settings` - System settings

## 🎨 Customization

### Adding New Categories

1. Navigate to Categories page
2. Click "Add Category"
3. Set name, color, and icon
4. Assign parent category (optional)

### Creating Print Templates

1. Go to Templates page
2. Create new template
3. Customize header, body, and footer
4. Set as default template

### Adding Products

1. Navigate to Products page
2. Click "Add Product"
3. Fill in product details
4. Assign category and provider
5. Set pricing and stock information

## 🚀 Deployment

### Frontend (Angular)

```powershell
ng build --configuration production
```

Deploy the `dist/` folder to your web server.

### Backend (Node.js)

```powershell
cd server
npm start
```

Use PM2 for production:

```powershell
npm install -g pm2
pm2 start index.js --name pos-api
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Verify MongoDB is running: `mongosh`
- Check credentials in `.env` file
- Ensure network connectivity

### Camera Scanner Not Working

- Use HTTPS (required for camera access)
- Check browser permissions
- Verify html5-qrcode library is loaded

### Scale Not Connecting

- Use Chrome or Edge browser
- Enable Web Serial API in browser flags
- Check USB connection

### Build Errors

- Clear cache: `npm cache clean --force`
- Delete `node_modules` and reinstall
- Check Angular CLI version

## 🔄 Future Enhancements

- [ ] Customer management and loyalty programs
- [ ] Multiple store locations support
- [ ] Advanced inventory management
- [ ] Purchase order system
- [ ] Barcode label printing
- [ ] Mobile app (React Native/Flutter)
- [ ] Cloud deployment guides
- [ ] Offline mode support
- [ ] Multi-language support
- [ ] Email/SMS receipts

## 📄 License

MIT License - feel free to use this project for commercial purposes.

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Check MongoDB connection logs
4. Verify all dependencies are installed

## 🌐 LAN Access - Multi-Device Setup

### ✅ Configuration Complete!

Your POS system is now configured for LAN access, allowing multiple devices (tablets, phones, other PCs) to connect simultaneously!

#### Quick Start:

```powershell
# Start both servers
cd c:\Users\IRWIN\Documents\pdev
.\start-pos.ps1

# Configure firewall (once, as Administrator)
.\setup-firewall.ps1
```

#### Access URLs:

- **Your Network IP**: `192.168.160.1`
- **From this PC**: http://localhost:4200
- **From any device on your network**: http://192.168.160.1:4200

#### New Features:

- ✅ **Auto-Focus Search Bar** - Focuses automatically for barcode scanning
- ✅ **Fuzzy Search** - Tolerates misspellings with Levenshtein distance
- ✅ **300ms Debounce** - Prevents excessive API calls
- ✅ **LAN Binding** - Server accessible on all network interfaces
- ✅ **16,994 Grocery Products** - Pre-loaded product database

#### Documentation:

- `SETUP_COMPLETE.md` - Complete setup and testing guide
- `LAN_ACCESS.md` - Detailed LAN configuration documentation
- `THEME.md` - Theme system customization guide

#### Troubleshooting:

- Can't access from other devices? Run `.\setup-firewall.ps1` as Administrator
- IP changed? Update `src/environments/environment.ts`
- Check status: `netstat -ano | findstr "3001 4200"`

---

## 🙏 Credits

Built with:

- **Angular 21** - Frontend framework with standalone components
- **Node.js & Express** - Backend API with fuzzy search
- **MongoDB** - Database with 16,994 products
- **html5-qrcode** - Barcode scanning
- **Web Serial API** - Scale integration
- **Docker** - MongoDB containerization

---

**Happy Selling! 🛒💰**
