import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
  isActive: z.boolean().default(true),
  groupIds: z.array(z.number()).optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onSuccess: () => void;
}

export default function UserModal({ isOpen, onClose, user, onSuccess }: UserModalProps) {
  const { toast } = useToast();
  const isEditing = !!user;

  const { data: groups = [] } = useQuery({
    queryKey: ["/api/groups"],
    enabled: isOpen,
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "groups"],
    enabled: isOpen && isEditing,
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
      isActive: true,
      ...user,
    },
  });

  useEffect(() => {
    if (user && userGroups) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role || "user",
        isActive: user.isActive !== undefined ? user.isActive : true,
        groupIds: Array.isArray(userGroups) ? userGroups.map((g: any) => g.id) : [],
      });
    } else if (!user) {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        role: "user",
        isActive: true,
        groupIds: [],
      });
    }
  }, [user?.id, isOpen, form.reset]); // Only depend on user ID and modal open state

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const url = isEditing ? `/api/users/${user.id}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onSuccess();
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
        description: `Failed to ${isEditing ? "update" : "create"} user`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="transition_specialist">Transition Specialist</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Selection */}
            <FormField
              control={form.control}
              name="groupIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Groups *</FormLabel>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {groups.map((group: any) => {
                      const isChecked = field.value?.includes(group.id) || false;
                      const selectedRole = form.watch("role");
                      const isStandardUser = selectedRole === "user";
                      const currentSelections = field.value || [];
                      const canSelect = !isStandardUser || currentSelections.length === 0;
                      
                      return (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={isChecked}
                            disabled={!canSelect && !isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                if (isStandardUser) {
                                  // Standard users can only be in one group
                                  field.onChange([group.id]);
                                } else {
                                  // Admin/Transition specialists can be in multiple groups
                                  field.onChange([...currentSelections, group.id]);
                                }
                              } else {
                                field.onChange(currentSelections.filter((id: number) => id !== group.id));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`group-${group.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {group.name}
                          </label>
                        </div>
                      );
                    })}
                    {groups.length === 0 && (
                      <p className="text-sm text-muted-foreground">No groups available</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.watch("role") === "user" 
                      ? "Standard users can only be in one group" 
                      : "Admin and Transition Specialists can be in multiple groups"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active User</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Inactive users cannot access the system
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Update User" : "Save User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
