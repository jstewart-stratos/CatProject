import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import GroupModal from "@/components/modals/group-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users } from "lucide-react";

export default function Groups() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<{ [key: number]: any[] }>({});

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

  // Fetch group members when expanded
  const fetchGroupMembers = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      const members = await response.json();
      setGroupMembers(prev => ({ ...prev, [groupId]: members }));
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  // Fetch member counts for all groups when groups are loaded
  useEffect(() => {
    if (groups && groups.length > 0) {
      groups.forEach((group: any) => {
        if (!groupMembers[group.id]) {
          fetchGroupMembers(group.id);
        }
      });
    }
  }, [groups]);

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      console.log("Attempting to delete group:", groupId);
      const response = await apiRequest("DELETE", `/api/groups/${groupId}`);
      console.log("Delete response:", response);
      return response;
    },
    onSuccess: () => {
      console.log("Group deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Success!",
        description: "Group deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: `Failed to delete group: ${error.message}`,
        variant: "destructive",
      });
    },
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

  const openDetailsModal = (group: any) => {
    setSelectedGroupForDetails(group);
    setIsDetailsModalOpen(true);
    // Fetch members if not already loaded
    if (!groupMembers[group.id]) {
      fetchGroupMembers(group.id);
    }
  };

  const closeDetailsModal = () => {
    setSelectedGroupForDetails(null);
    setIsDetailsModalOpen(false);
  };

  const handleDeleteGroup = (groupId: number) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      deleteGroupMutation.mutate(groupId);
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupsLoading ? (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-500">Loading groups...</p>
              </div>
            ) : groups?.length > 0 ? (
              groups.map((group: any) => {
                const members = groupMembers[group.id] || [];
                const memberCount = members.length;
                
                return (
                  <Card key={group.id} className="h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openDetailsModal(group)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openModal(group)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-4 flex-1">
                        {group.description || 'No description provided'}
                      </p>
                      
                      <div className="flex items-center text-sm text-slate-500 mt-auto">
                        <Users className="h-4 w-4 mr-1" />
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-500">No groups found</p>
              </div>
            )}
            
            {/* Add New Group Card */}
            <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer h-fit">
              <CardContent 
                className="p-6 flex flex-col items-center justify-center text-center"
                onClick={() => openModal()}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Create New Group</h3>
                <p className="text-sm text-slate-600">
                  Organize users and share data efficiently
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

      {/* Group Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={closeDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{selectedGroupForDetails?.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedGroupForDetails && (
            <div className="space-y-6">
              {/* Group Info */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Description</h4>
                <p className="text-sm text-slate-600">
                  {selectedGroupForDetails.description || 'No description provided'}
                </p>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Group Members ({(groupMembers[selectedGroupForDetails.id] || []).length})
                </h4>
                {(groupMembers[selectedGroupForDetails.id] || []).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(groupMembers[selectedGroupForDetails.id] || []).map((member: any) => (
                      <div key={member.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {((member.firstName || '')[0] || '') + ((member.lastName || '')[0] || '')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {(member.firstName || '')} {(member.lastName || '')}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{member.username || 'unknown'} • {member.role || 'user'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic bg-slate-50 rounded-lg p-4 text-center">
                    No members in this group
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      closeDetailsModal();
                      openModal(selectedGroupForDetails);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Group
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      closeDetailsModal();
                      handleDeleteGroup(selectedGroupForDetails.id);
                    }}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <Button variant="ghost" onClick={closeDetailsModal}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
