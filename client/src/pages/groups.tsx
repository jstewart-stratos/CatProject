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
import { Plus, Edit, Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";

export default function Groups() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
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

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest(`/api/groups/${groupId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Success!",
        description: "Group deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete group.",
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

  const toggleGroupExpansion = (groupId: number) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      // Fetch members if not already loaded
      if (!groupMembers[groupId]) {
        fetchGroupMembers(groupId);
      }
    }
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
          <div className="space-y-4">
            {groupsLoading ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Loading groups...</p>
              </div>
            ) : groups?.length > 0 ? (
              groups.map((group: any) => {
                const isExpanded = expandedGroup === group.id;
                const members = groupMembers[group.id] || [];
                const memberCount = members.length;
                
                return (
                  <Card key={group.id} className="overflow-hidden">
                    {/* Main Group Info - Always Visible */}
                    <CardContent 
                      className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-slate-400" />
                              )}
                              <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {group.description || 'No description provided'}
                          </p>
                          <div className="flex items-center mt-2 text-sm text-slate-500">
                            <Users className="h-4 w-4 mr-1" />
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Expanded Details - Only When Expanded */}
                    {isExpanded && (
                      <div className="border-t bg-slate-50">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Members Section */}
                            <div>
                              <h4 className="text-sm font-medium text-slate-700 mb-3">Group Members</h4>
                              {members.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {members.map((member: any) => (
                                    <div key={member.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-medium text-xs">
                                          {((member.firstName || '')[0] || '') + ((member.lastName || '')[0] || '')}
                                        </span>
                                      </div>
                                      <div>
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
                                <p className="text-sm text-slate-500 italic">No members in this group</p>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center space-x-3 pt-4 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(group);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Group
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(group.id);
                                }}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    )}
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No groups found</p>
              </div>
            )}
            
            {/* Add New Group Card */}
            <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer">
              <CardContent 
                className="p-6 flex flex-col items-center justify-center"
                onClick={() => openModal()}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Create New Group</h3>
                <p className="text-sm text-slate-600 text-center">
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
    </div>
  );
}
