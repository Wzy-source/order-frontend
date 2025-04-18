import { AdminOrderList } from '../components/AdminOrderList';

function AdminPage() {
    // In a real app, add checks to ensure only authorized admins can access this page
    return (
        <div>
            <h2>Admin Dashboard</h2>
            <AdminOrderList />
            {/* Add components for setting config values if needed */}
        </div>
    );
}
export default AdminPage;
