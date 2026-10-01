# Authentic Lanka Exports ERP
## Login, Security & Role-Based Access Control: User Manual

Welcome to the **Authentic Lanka Exports ERP (Manufacturing & Distribution)** system. This user manual provides a comprehensive, part-by-part guide to logging in, default credentials, security protocols, roles and permissions, personal account settings, and administrative user management.

---

## 1. Default Login Credentials (For Testing & Verification)

To log into the ERP for the first time or during system testing, you can use the default Administrator credentials seeded in the system database:

* **Email Address**: `admin@example.com`
* **Default Password**: `Admin123!`
* **Access Level**: Admin (Full Access)

> [!CAUTION]
> **Change the Default Password Immediately**: Once the system goes live or is deployed in a production environment, change this default password or delete this test account from the **Users** panel to prevent unauthorized access.

---

## 2. Accessing the ERP & Logging In

Every user in the organization is given a unique set of credentials (an email address and password) to log into the ERP. 

### Step-by-Step Login Procedure:
1. Open your web browser and navigate to the ERP login page URL (e.g., `http://localhost:5173/login` or your hosted server domain).
2. You will be greeted by the **Authentic Lanka Exports ERP Sign In** card.
3. **Email Address**: Enter the email address registered with your account (e.g., `admin@example.com`).
4. **Password**: Enter your secret password (e.g., `Admin123!`).
   * *Tip*: You can click the **Eye icon** (`👁️` / `👁️‍🗨️`) on the right side of the password field to toggle the visibility of your characters to prevent mistakes.
5. Click the **Sign in** button.
6. Upon successful authentication, a greeting message will appear (e.g., *"Welcome back, Admin!"*) and you will be redirected to the **Dashboard**.

> [!IMPORTANT]
> If you have forgotten your password, there is no public self-service reset page. You must contact your system **Administrator** to have your password reset or changed.

---

## 3. Login Security & Attempt Restrictions

The system implements industry-standard security features to protect company data from unauthorized access:

### A. Brute-Force Protection & Lockouts
* **Maximum Attempts**: You are allowed up to **5 failed login attempts** (entering a wrong password or email combination).
* **Remaining Attempts Warning**: Each time a login fails, the system displays an error message informing you of the remaining attempts (e.g., *"Invalid email or password. 4 attempt(s) remaining."*).
* **Lockout Duration**: If you fail to log in 5 times consecutively, the account is automatically locked for **15 minutes**.
* **Lockout Error**: Any subsequent login attempt within the lockout period will show: *"Account locked due to too many failed attempts. Try again in 15 minutes."*

### B. Account Deactivation
* If a team member leaves the company or has their access suspended, an administrator will change their account status to **Inactive**.
* If you try to log into an inactive account, the system will block the attempt and display the message: *"Account is deactivated. Contact admin."*

---

## 4. User Roles & Permission Levels

The ERP uses **Role-Based Access Control (RBAC)** to ensure that employees only access the information relevant to their jobs. Permissions are predefined for each role but can be customized with user-specific overrides by an administrator.

Here is a part-by-part description of the roles defined in the system and their access levels:

### Detailed Role Descriptions

1. **Super Admin / Admin**
   * **Scope**: Complete, unrestricted control over the entire system.
   * **Key Tasks**: System setup, user registration, modifying permissions, configuring roles, viewing system logs, adjusting global settings, and executing overrides (e.g., overriding credit limits on orders).
   
2. **Warehouse Manager**
   * **Scope**: Manages the storage facilities, catalog, and inventory flow.
   * **Key Tasks**: Creating and editing products, categories, brands, and Units of Measure (UOM); adjusting stock levels; performing stock transfers between warehouses; managing Goods Receipt Notes (GRNs); processing damaged items and supplier returns; viewing inventory reports.

3. **Warehouse Staff**
   * **Scope**: Practical day-to-day warehouse operations.
   * **Key Tasks**: Viewing stock levels, initiating warehouse stock transfers, processing inventory adjustments, recording Goods Receipt Notes (GRNs), and logging damaged inventory.

4. **Production Staff**
   * **Scope**: Handles manufacturing lines and recipe formulations.
   * **Key Tasks**: Viewing/creating Bills of Materials (BOM), managing and tracking production batches (Start/Complete batches), updating batch status, and viewing production reports.

5. **Sales Manager**
   * **Scope**: Drives and oversees the sales pipelines and customer relations.
   * **Key Tasks**: Creating, editing, and approving sales orders; overriding credit limits; managing customers and customer groups; accessing the POS (Point of Sale) module; issuing invoices, payments, credit notes, and customer returns; viewing sales reports.

6. **Sales Representative (Sales Rep)**
   * **Scope**: Frontline customer relationship management.
   * **Key Tasks**: Creating and modifying sales orders, viewing product prices and stock, managing customers, using the POS screen, generating invoices, collecting payments, and initiating customer returns. (Cannot approve orders or override credit limits).

7. **Accountant**
   * **Scope**: Financial auditing and reporting.
   * **Key Tasks**: Viewing invoices, bills, payments, and credit notes; recording customer payments and supplier bills; auditing sales and purchase orders; reviewing customer/supplier lists; accessing financial and sales reports.

8. **Cashier**
   * **Scope**: Point of Sale operation.
   * **Key Tasks**: Accessing the POS system, viewing products and stock counts, creating and completing retail sales, printing invoices, and processing cash/card payments.

9. **HR Manager**
   * **Scope**: Personnel management and payroll administration.
   * **Key Tasks**: Managing employee records, departments, designations, shifts, attendance sheets, and holidays; approving or rejecting leave requests; setting up salary structures; generating and distributing payrolls; viewing HR reports.

10. **Employee (General Staff)**
    * **Scope**: Self-service workspace.
    * **Key Tasks**: Viewing their own attendance logs, requesting leaves (and checking leave balances), and viewing their salary slips/payroll documents.

---

### Access Matrix Summary

| Module / Feature | Admin | Warehouse Mgr | Sales Mgr | Accountant | HR Mgr | Sales Rep | Cashier | Warehouse Staff | Production Staff | Employee |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **System Settings & Audit Logs** | Yes | No | No | No | No | No | No | No | No | No |
| **User & Role Management** | Yes | No | No | No | No | No | No | No | No | No |
| **Product & Brand Setup** | Yes | Yes | No | No | No | No | No | No | No | No |
| **Stock Adjustments / Transfers** | Yes | Yes | No | No | No | No | No | Yes | No | No |
| **BOM & Production Batches** | Yes | No | No | No | No | No | No | No | Yes | No |
| **Sales Order Creation** | Yes | No | Yes | View | No | Yes | Yes | No | No | No |
| **Sales Order Approval** | Yes | No | Yes | No | No | No | No | No | No | No |
| **POS Terminal Access** | Yes | No | Yes | No | No | Yes | Yes | No | No | No |
| **Invoices & Payments** | Yes | No | Yes | Yes | No | Yes | Yes | No | No | No |
| **Employee & Payroll Management**| Yes | No | No | No | Yes | No | No | No | No | No |
| **View Own Payroll / Attendance**| Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

---

## 5. Personal Account Settings (Profile & Password Change)

Once logged in, any user can manage their personal profile details and update their password for security compliance.

### A. Updating Personal Information
1. Click on the **User Profile** dropdown/icon (usually in the header/sidebar) and select **My Profile**.
2. Under the **Personal Information** card, you can update:
   * **First Name**
   * **Last Name**
   * **Phone Number**
3. *Note*: Your email address is linked to your login ID and is read-only.
4. Click **Save Profile** to apply changes.

### B. Changing Your Password
For security reasons, you should change your password regularly:
1. Go to **My Profile**.
2. Find the **Password & Security** card and click the **Change Password** button.
3. Fill out the three required fields:
   * **Current Password**: Enter your current login password (to prove identity).
   * **New Password**: Enter your new password (**minimum 8 characters**).
   * **Confirm New Password**: Re-enter the new password exactly.
   * *Security Warning*: The system requires passwords to meet security standards. Make sure your password contains letters, numbers, and symbols for maximum protection.
4. Click **Update Password**.
5. If successful, you will receive a toast alert: *"Password changed successfully"*. The form will close.

---

## 6. Administrator Instructions (Managing User Logins)

Users with the **Admin** or **Super Admin** role have the authority to manage other users' logins.

### A. Creating a New User (Adding a Team Member)
1. Navigate to the **Users** section from the sidebar menu.
2. Click the **+ Add User** button at the top right.
3. Fill in the user registration form:
   * **First Name** & **Last Name**
   * **Email**: Enter a valid business email. This will be their unique username.
   * **Phone** (Optional)
   * **Role**: Select the primary role from the dropdown (e.g., *Warehouse Manager*, *Accountant*, etc.).
4. Input a strong initial password.
5. Click **Submit** or **Save**. 
   * *Tip*: Share this initial password securely with the new employee. They should change it immediately upon their first login through the **My Profile** page.

### B. Activating or Deactivating a User
1. Locate the user in the user table.
2. If you need to temporarily lock or permanently disable an employee's access, click the **Trash/Deactivate** icon (or edit status) next to their name.
3. Confirm the action. The status badge will change to **Inactive**.
4. To reactivate, edit the user's form, check **Active**, and save.

### C. Monitoring User Activities
On the **Users** dashboard, admins can monitor:
* **Total Users** / **Active Users** / **Inactive Users** counts.
* **Last Login** column: Displays the exact date and time the user last signed into the system. Use this to audit active sessions and identify stale accounts.
