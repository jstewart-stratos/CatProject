import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import GroupModal from "@/components/modals/group-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users } from "lucide-react";

export default function Groups() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

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

  const { data: groups, isLoading: groupsLoading, refetch } = useQuery({
    queryKey: ["/api/groups"],
    enabled: isAuthenticated,
  });

  const openModal = (group?: any) => {
    setSelectedGroup(group || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedGroup(null);
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    refetch();
    closeModal();
    toast({
      title: "Success!",
      description: `Group has been ${selectedGroup ? 'updated' : 'created'} successfully.`,
    });
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="groups" />
      <div className="ml-64">
        <TopBar 
          title="Group Management" 
          subtitle="Organize users into groups with specific permissions"
        />
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {groupsLoading ? (
              <div className="col-span-3 text-center py-8">
                <p className="text-slate-500">Loading groups...</p>
              </div>
            ) : groups?.length > 0 ? (
              groups.map((group: any) => (
                <Card key={group.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openModal(group)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">
                      {group.description || 'No description provided'}
                    </p>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Permissions</h4>
                      <div className="flex flex-wrap gap-1">
                        {group.permissions?.length > 0 ? (
                          group.permissions.slice(0, 3).map((permission: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">No permissions</Badge>
                        )}
                        {group.permissions?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-700">Members</h4>
                        <span className="text-xs text-slate-500 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          0 members
                        </span>
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-slate-600 font-medium text-xs">+</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <p className="text-slate-500">No groups found</p>
              </div>
            )}
            
            {/* Add New Group Card */}
            <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer">
              <CardContent 
                className="p-6 flex flex-col items-center justify-center h-full"
                onClick={() => openModal()}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg mb-2">Create New Group</CardTitle>
                <p className="text-sm text-slate-600 text-center">
                  Organize users and manage permissions efficiently
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <GroupModal
        isOpen={isModalOpen}
        onClose={closeModal}
        group={selectedGroup}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
