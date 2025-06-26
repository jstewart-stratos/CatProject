import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: any;
  onSuccess: () => void;
}

export default function GroupModal({ isOpen, onClose, group, onSuccess }: GroupModalProps) {
  const { toast } = useToast();
  const isEditing = !!group;
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      ...group,
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name || "",
        description: group.description || "",
      });
      // Get existing group members if editing
      if (group.id) {
        fetchGroupMembers(group.id);
      }
    } else {
      form.reset({
        name: "",
        description: "",
      });
      setSelectedUsers([]);
      setGroupMembers([]);
    }
    setSearchTerm("");
    setShowUserSearch(false);
  }, [group, form]);

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await apiRequest("GET", `/api/groups/${groupId}/members`);
      
      // The API response should already be full user objects, not just userIds
      if (Array.isArray(response)) {
        const memberIds = response.map((member: any) => member.id || member.userId);
        setSelectedUsers(memberIds);
        setGroupMembers(response);
      } else {
        console.error("Unexpected response format:", response);
        setSelectedUsers([]);
        setGroupMembers([]);
      }
    } catch (error) {
      console.error("Error fetching group members:", error);
      setSelectedUsers([]);
      setGroupMembers([]);
    }
  };

  const addUserToGroup = (user: any) => {
    if (!selectedUsers.includes(user.id)) {
      setSelectedUsers([...selectedUsers, user.id]);
      setGroupMembers([...groupMembers, user]);
    }
    setSearchTerm("");
    setShowUserSearch(false);
  };

  const removeUserFromGroup = async (userId: string) => {
    // If we're editing an existing group, make API call to remove immediately
    if (isEditing && group?.id) {
      try {
        await apiRequest("DELETE", `/api/groups/${group.id}/users/${userId}`);
        toast({
          title: "Success",
          description: "Member removed from group successfully",
        });
        // Refresh group members list
        fetchGroupMembers(group.id);
      } catch (error) {
        console.error("Error removing user from group:", error);
        toast({
          title: "Error",
          description: "Failed to remove member from group",
          variant: "destructive",
        });
        return; // Don't update local state if API call failed
      }
    }
    
    // Update local state
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
    setGroupMembers(groupMembers.filter(member => member.id !== userId));
  };

  // Filter users for search (exclude current members)
  const availableUsers = users?.filter((user: any) => 
    !selectedUsers.includes(user.id) &&
    (
      (user.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
  ) || [];

  const mutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const url = isEditing ? `/api/groups/${group.id}` : "/api/groups";
      const method = isEditing ? "PUT" : "POST";
      
      // Create the group first
      const groupResponse = await apiRequest(method, url, data);
      
      // If we have selected users, add them to the group
      if (selectedUsers.length > 0) {
        const groupId = isEditing ? group.id : groupResponse.id;
        
        // Clear existing members if editing
        if (isEditing) {
          await apiRequest("DELETE", `/api/groups/${groupId}/members`);
        }
        
        // Add selected users
        await apiRequest("POST", `/api/groups/${groupId}/members`, {
          userIds: selectedUsers
        });
      }
      
      return groupResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onSuccess();
      toast({
        title: "Success",
        description: `Group ${isEditing ? "updated" : "created"} successfully`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} group`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GroupFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{isEditing ? "Edit Group" : "Create New Group"}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter group name (e.g., Sales Team, Operations Team)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the purpose of this group and what data members will share"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="text-base">Group Members</FormLabel>
              <p className="text-sm text-muted-foreground mb-4">
                Users who can share and view each other's client and account data
              </p>
              
              {/* Current Members */}
              {groupMembers.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Current Members ({groupMembers.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {groupMembers.map((member, index) => (
                      <Badge 
                        key={`${member.id}-${index}`} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                      >
                        {(member.firstName || '')} {(member.lastName || '')}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeUserFromGroup(member.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add New Members */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowUserSearch(!showUserSearch)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Member
                  </Button>
                </div>
                
                {showUserSearch && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {searchTerm && availableUsers.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {availableUsers.slice(0, 10).map((user: any) => (
                          <div 
                            key={user.id}
                            className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => addUserToGroup(user)}
                          >
                            <div>
                              <p className="font-medium">
                                {(user.firstName || '')} {(user.lastName || '')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{user.username || 'unknown'} • {user.role || 'user'}
                              </p>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchTerm && availableUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No users found matching "{searchTerm}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Group" : "Create Group")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}