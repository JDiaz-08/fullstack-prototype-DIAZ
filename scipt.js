// Global Variables
const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;
let editingEmployeeId = null;
let editingDepartmentId = null;
let editingAccountId = null;

// Database structure
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    initEventListeners();
    
    // Set initial hash if empty
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    
    // Check for existing auth token
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        const user = window.db.accounts.find(acc => acc.email === authToken && acc.verified);
        if (user) {
            setAuthState(true, user);
        } else {
            localStorage.removeItem('auth_token');
        }
    }
    
    handleRouting();
});

// ============================================
// STORAGE MANAGEMENT
// ============================================

function loadFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            window.db = JSON.parse(stored);
        } else {
            seedDatabase();
        }
    } catch (e) {
        console.error('Failed to load from storage:', e);
        seedDatabase();
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
    } catch (e) {
        console.error('Failed to save to storage:', e);
        showToast('Failed to save data', 'danger');
    }
}

function seedDatabase() {
    window.db = {
        accounts: [
            {
                id: generateId(),
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'Admin',
                verified: true
            }
        ],
        departments: [
            { id: generateId(), name: 'Engineering', description: 'Software team' },
            { id: generateId(), name: 'HR', description: 'Human Resources' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

// ============================================
// ROUTING
// ============================================

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); // Remove '#/'
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Protected routes - require authentication
    const protectedRoutes = ['profile', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];
    
    // Check authentication
    if (protectedRoutes.includes(route) || adminRoutes.includes(route)) {
        if (!currentUser) {
            navigateTo('#/login');
            return;
        }
    }
    
    // Check admin access
    if (adminRoutes.includes(route)) {
        if (currentUser.role !== 'Admin') {
            showToast('Access denied: Admin only', 'danger');
            navigateTo('#/');
            return;
        }
    }
    
    // Route to appropriate page
    let pageId = 'home-page';
    
    switch(route) {
        case '':
        case '/':
            pageId = 'home-page';
            break;
        case 'register':
            pageId = 'register-page';
            break;
        case 'verify-email':
            pageId = 'verify-email-page';
            const unverifiedEmail = localStorage.getItem('unverified_email');
            if (unverifiedEmail) {
                document.getElementById('verify-email-display').textContent = unverifiedEmail;
            }
            break;
        case 'login':
            pageId = 'login-page';
            break;
        case 'profile':
            pageId = 'profile-page';
            renderProfile();
            break;
        case 'employees':
            pageId = 'employees-page';
            renderEmployeesTable();
            break;
        case 'departments':
            pageId = 'departments-page';
            renderDepartmentsTable();
            break;
        case 'accounts':
            pageId = 'accounts-page';
            renderAccountsTable();
            break;
        case 'requests':
            pageId = 'requests-page';
            renderRequestsList();
            break;
        default:
            pageId = 'home-page';
    }
    
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
}

window.addEventListener('hashchange', handleRouting);

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    // Registration form
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Verify email simulation
    document.getElementById('simulate-verify-btn').addEventListener('click', handleVerifyEmail);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Employee form
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);
    
    // Department form
    document.getElementById('department-form').addEventListener('submit', handleDepartmentSubmit);
    
    // Account form
    document.getElementById('account-form').addEventListener('submit', handleAccountSubmit);
    
    // Request form
    document.getElementById('request-form').addEventListener('submit', handleRequestSubmit);
}

// ============================================
// AUTHENTICATION
// ============================================

function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    
    // Check if email already exists
    if (window.db.accounts.find(acc => acc.email === email)) {
        showToast('Email already registered', 'danger');
        return;
    }
    
    // Validate password
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }
    
    // Create new account
    const newAccount = {
        id: generateId(),
        firstName,
        lastName,
        email,
        password,
        role: 'User',
        verified: false
    };
    
    window.db.accounts.push(newAccount);
    saveToStorage();
    
    // Store unverified email
    localStorage.setItem('unverified_email', email);
    
    // Clear form
    document.getElementById('register-form').reset();
    
    showToast('Account created! Please verify your email.', 'success');
    navigateTo('#/verify-email');
}

function handleVerifyEmail() {
    const email = localStorage.getItem('unverified_email');
    if (!email) {
        showToast('No pending verification', 'danger');
        return;
    }
    
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        
        // Show success message on login page
        const loginSuccessMsg = document.getElementById('login-success-message');
        loginSuccessMsg.innerHTML = '<div class="alert alert-success">✅ Email verified! You may now log in.</div>';
        
        showToast('Email verified successfully!', 'success');
        navigateTo('#/login');
    } else {
        showToast('Verification failed', 'danger');
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    
    const account = window.db.accounts.find(acc => 
        acc.email === email && 
        acc.password === password && 
        acc.verified === true
    );
    
    if (account) {
        // Save auth token
        localStorage.setItem('auth_token', email);
        
        // Set auth state
        setAuthState(true, account);
        
        // Clear form
        document.getElementById('login-form').reset();
        
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    } else {
        showToast('Invalid credentials or email not verified', 'danger');
    }
}

function handleLogout(e) {
    e.preventDefault();
    
    localStorage.removeItem('auth_token');
    setAuthState(false);
    
    showToast('Logged out successfully', 'success');
    navigateTo('#/');
}

function setAuthState(isAuth, user = null) {
    currentUser = user;
    
    const body = document.body;
    
    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        
        // Update username display
        document.getElementById('nav-username').textContent = user.firstName + ' ' + user.lastName;
        
        // Check if admin
        if (user.role === 'Admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        currentUser = null;
    }
}

// ============================================
// PROFILE PAGE
// ============================================

function renderProfile() {
    if (!currentUser) return;
    
    document.getElementById('profile-name').textContent = currentUser.firstName + ' ' + currentUser.lastName;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role').textContent = currentUser.role;
}

// ============================================
// EMPLOYEES MANAGEMENT
// ============================================

function renderEmployeesTable() {
    const tbody = document.getElementById('employees-table-body');
    
    if (window.db.employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees.</td></tr>';
        return;
    }
    
    tbody.innerHTML = window.db.employees.map(emp => {
        const account = window.db.accounts.find(acc => acc.email === emp.email);
        const department = window.db.departments.find(dept => dept.id === emp.departmentId);
        const name = account ? `${account.firstName} ${account.lastName}` : emp.email;
        const deptName = department ? department.name : 'N/A';
        
        return `
            <tr>
                <td>${emp.employeeId}</td>
                <td>${name}</td>
                <td>${emp.position}</td>
                <td>${deptName}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editEmployee('${emp.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddEmployeeForm() {
    document.getElementById('employee-form-title').textContent = 'Add Employee';
    document.getElementById('employee-form').reset();
    document.getElementById('employee-id-hidden').value = '';
    editingEmployeeId = null;
    
    // Populate departments dropdown
    const deptSelect = document.getElementById('employee-department');
    deptSelect.innerHTML = window.db.departments.map(dept => 
        `<option value="${dept.id}">${dept.name}</option>`
    ).join('');
    
    document.getElementById('employee-form-container').style.display = 'block';
}

function hideEmployeeForm() {
    document.getElementById('employee-form-container').style.display = 'none';
    editingEmployeeId = null;
}

function editEmployee(id) {
    const employee = window.db.employees.find(emp => emp.id === id);
    if (!employee) return;
    
    editingEmployeeId = id;
    document.getElementById('employee-form-title').textContent = 'Edit Employee';
    document.getElementById('employee-id-hidden').value = id;
    document.getElementById('employee-id').value = employee.employeeId;
    document.getElementById('employee-email').value = employee.email;
    document.getElementById('employee-position').value = employee.position;
    document.getElementById('employee-hiredate').value = employee.hireDate;
    
    // Populate departments dropdown
    const deptSelect = document.getElementById('employee-department');
    deptSelect.innerHTML = window.db.departments.map(dept => 
        `<option value="${dept.id}" ${dept.id === employee.departmentId ? 'selected' : ''}>${dept.name}</option>`
    ).join('');
    
    document.getElementById('employee-form-container').style.display = 'block';
}

function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    window.db.employees = window.db.employees.filter(emp => emp.id !== id);
    saveToStorage();
    renderEmployeesTable();
    showToast('Employee deleted', 'success');
}

function handleEmployeeSubmit(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee-id').value.trim();
    const email = document.getElementById('employee-email').value.trim().toLowerCase();
    const position = document.getElementById('employee-position').value.trim();
    const departmentId = document.getElementById('employee-department').value;
    const hireDate = document.getElementById('employee-hiredate').value;
    
    // Validate email exists in accounts
    if (!window.db.accounts.find(acc => acc.email === email)) {
        showToast('Email does not match any existing account', 'danger');
        return;
    }
    
    if (editingEmployeeId) {
        // Update existing
        const employee = window.db.employees.find(emp => emp.id === editingEmployeeId);
        employee.employeeId = employeeId;
        employee.email = email;
        employee.position = position;
        employee.departmentId = departmentId;
        employee.hireDate = hireDate;
        showToast('Employee updated', 'success');
    } else {
        // Create new
        const newEmployee = {
            id: generateId(),
            employeeId,
            email,
            position,
            departmentId,
            hireDate
        };
        window.db.employees.push(newEmployee);
        showToast('Employee added', 'success');
    }
    
    saveToStorage();
    hideEmployeeForm();
    renderEmployeesTable();
}

// ============================================
// DEPARTMENTS MANAGEMENT
// ============================================

function renderDepartmentsTable() {
    const tbody = document.getElementById('departments-table-body');
    
    if (window.db.departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments.</td></tr>';
        return;
    }
    
    tbody.innerHTML = window.db.departments.map(dept => `
        <tr>
            <td>${dept.name}</td>
            <td>${dept.description || ''}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editDepartment('${dept.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteDepartment('${dept.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddDepartmentForm() {
    document.getElementById('department-form').reset();
    document.getElementById('dept-id-hidden').value = '';
    editingDepartmentId = null;
    document.getElementById('department-form-container').style.display = 'block';
}

function hideDepartmentForm() {
    document.getElementById('department-form-container').style.display = 'none';
    editingDepartmentId = null;
}

function editDepartment(id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (!dept) return;
    
    editingDepartmentId = id;
    document.getElementById('dept-id-hidden').value = id;
    document.getElementById('dept-name').value = dept.name;
    document.getElementById('dept-description').value = dept.description || '';
    document.getElementById('department-form-container').style.display = 'block';
}

function deleteDepartment(id) {
    if (!confirm('Are you sure you want to delete this department?')) return;
    
    window.db.departments = window.db.departments.filter(d => d.id !== id);
    saveToStorage();
    renderDepartmentsTable();
    showToast('Department deleted', 'success');
}

function handleDepartmentSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('dept-name').value.trim();
    const description = document.getElementById('dept-description').value.trim();
    
    if (editingDepartmentId) {
        const dept = window.db.departments.find(d => d.id === editingDepartmentId);
        dept.name = name;
        dept.description = description;
        showToast('Department updated', 'success');
    } else {
        const newDept = {
            id: generateId(),
            name,
            description
        };
        window.db.departments.push(newDept);
        showToast('Department added', 'success');
    }
    
    saveToStorage();
    hideDepartmentForm();
    renderDepartmentsTable();
}

// ============================================
// ACCOUNTS MANAGEMENT
// ============================================

function renderAccountsTable() {
    const tbody = document.getElementById('accounts-table-body');
    
    if (window.db.accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No accounts.</td></tr>';
        return;
    }
    
    tbody.innerHTML = window.db.accounts.map(acc => {
        const verifiedIcon = acc.verified ? '✓' : '';
        const isSelf = currentUser && currentUser.email === acc.email;
        
        return `
            <tr>
                <td>${acc.firstName} ${acc.lastName}</td>
                <td>${acc.email}</td>
                <td>${acc.role}</td>
                <td>${verifiedIcon}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editAccount('${acc.id}')">Edit</button>
                    <button class="btn btn-sm btn-warning" onclick="resetPassword('${acc.id}')">Reset Password</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.id}')" ${isSelf ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddAccountForm() {
    document.getElementById('account-form').reset();
    document.getElementById('account-id-hidden').value = '';
    editingAccountId = null;
    document.getElementById('account-form-container').style.display = 'block';
}

function hideAccountForm() {
    document.getElementById('account-form-container').style.display = 'none';
    editingAccountId = null;
}

function editAccount(id) {
    const acc = window.db.accounts.find(a => a.id === id);
    if (!acc) return;
    
    editingAccountId = id;
    document.getElementById('account-id-hidden').value = id;
    document.getElementById('account-firstname').value = acc.firstName;
    document.getElementById('account-lastname').value = acc.lastName;
    document.getElementById('account-email').value = acc.email;
    document.getElementById('account-password').value = acc.password;
    document.getElementById('account-role').value = acc.role;
    document.getElementById('account-verified').checked = acc.verified;
    document.getElementById('account-form-container').style.display = 'block';
}

function deleteAccount(id) {
    const acc = window.db.accounts.find(a => a.id === id);
    
    // Prevent self-deletion
    if (currentUser && acc.email === currentUser.email) {
        showToast('Cannot delete your own account', 'danger');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    window.db.accounts = window.db.accounts.filter(a => a.id !== id);
    saveToStorage();
    renderAccountsTable();
    showToast('Account deleted', 'success');
}

function resetPassword(id) {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }
    
    const acc = window.db.accounts.find(a => a.id === id);
    if (acc) {
        acc.password = newPassword;
        saveToStorage();
        showToast('Password reset successfully', 'success');
    }
}

function handleAccountSubmit(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('account-firstname').value.trim();
    const lastName = document.getElementById('account-lastname').value.trim();
    const email = document.getElementById('account-email').value.trim().toLowerCase();
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    const verified = document.getElementById('account-verified').checked;
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }
    
    if (editingAccountId) {
        const acc = window.db.accounts.find(a => a.id === editingAccountId);
        acc.firstName = firstName;
        acc.lastName = lastName;
        acc.email = email;
        acc.password = password;
        acc.role = role;
        acc.verified = verified;
        showToast('Account updated', 'success');
    } else {
        // Check if email exists
        if (window.db.accounts.find(a => a.email === email)) {
            showToast('Email already exists', 'danger');
            return;
        }
        
        const newAccount = {
            id: generateId(),
            firstName,
            lastName,
            email,
            password,
            role,
            verified
        };
        window.db.accounts.push(newAccount);
        showToast('Account created', 'success');
    }
    
    saveToStorage();
    hideAccountForm();
    renderAccountsTable();
}

// ============================================
// REQUESTS MANAGEMENT
// ============================================

function renderRequestsList() {
    const container = document.getElementById('requests-container');
    
    // Filter requests for current user
    const userRequests = window.db.requests.filter(req => req.employeeEmail === currentUser.email);
    
    if (userRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>You have no requests yet.</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#requestModal">Create One</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${userRequests.map(req => {
                        const statusClass = req.status === 'Pending' ? 'status-pending' : 
                                          req.status === 'Approved' ? 'status-approved' : 'status-rejected';
                        const itemsList = req.items.map(item => `${item.name} (${item.qty})`).join(', ');
                        
                        return `
                            <tr>
                                <td>${new Date(req.date).toLocaleDateString()}</td>
                                <td>${req.type}</td>
                                <td>${itemsList}</td>
                                <td><span class="badge ${statusClass}">${req.status}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function addRequestItem() {
    const container = document.getElementById('request-items-container');
    const newItem = document.createElement('div');
    newItem.className = 'input-group mb-2 request-item';
    newItem.innerHTML = `
        <input type="text" class="form-control" placeholder="Item name" required>
        <input type="number" class="form-control" placeholder="Qty" value="1" min="1" required>
        <button type="button" class="btn btn-danger" onclick="removeRequestItem(this)">×</button>
    `;
    container.appendChild(newItem);
}

function removeRequestItem(button) {
    const container = document.getElementById('request-items-container');
    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        showToast('Must have at least one item', 'warning');
    }
}

function handleRequestSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('request-type').value;
    const itemElements = document.querySelectorAll('.request-item');
    
    const items = [];
    itemElements.forEach(elem => {
        const inputs = elem.querySelectorAll('input');
        const name = inputs[0].value.trim();
        const qty = parseInt(inputs[1].value);
        if (name) {
            items.push({ name, qty });
        }
    });
    
    if (items.length === 0) {
        showToast('Must have at least one item', 'danger');
        return;
    }
    
    const newRequest = {
        id: generateId(),
        type,
        items,
        status: 'Pending',
        date: new Date().toISOString(),
        employeeEmail: currentUser.email
    };
    
    window.db.requests.push(newRequest);
    saveToStorage();
    
    // Reset form
    document.getElementById('request-form').reset();
    document.getElementById('request-items-container').innerHTML = `
        <div class="input-group mb-2 request-item">
            <input type="text" class="form-control" placeholder="Item name" required>
            <input type="number" class="form-control" placeholder="Qty" value="1" min="1" required>
            <button type="button" class="btn btn-danger" onclick="removeRequestItem(this)">×</button>
        </div>
    `;
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
    modal.hide();
    
    showToast('Request submitted successfully', 'success');
    renderRequestsList();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastBody = document.getElementById('toast-message');
    
    toastBody.textContent = message;
    toast.className = `toast bg-${type} text-white`;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}