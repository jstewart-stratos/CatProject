import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import UserModal from "@/components/modals/user-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Key, Ban } from "lucide-react";

export default function Users() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: users, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const openModal = (user?: any) => {
    setSelectedUser(user || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    refetch();
    closeModal();
    toast({
      title: "Success!",
      description: `User has been ${selectedUser ? 'updated' : 'created'} successfully.`,
    });
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="users" />
      <div className="ml-64">
        <TopBar 
          title="User Management" 
          subtitle="Manage system users and permissions"
        />
        
        <div className="p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>User Management</CardTitle>
              <Button onClick={() => openModal()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Groups</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : users?.length > 0 ? (
                      users.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-800">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            -
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => openModal(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <UserModal
        isOpen={isModalOpen}
        onClose={closeModal}
        user={selectedUser}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
