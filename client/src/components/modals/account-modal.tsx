import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertAccountSchema } from "@shared/schema";
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

const accountFormSchema = insertAccountSchema.extend({
  clientId: z.number().min(1, "Client is required"),
  accountType: z.string().min(1, "Account type is required"),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: any;
  onSuccess: () => void;
}

export default function AccountModal({ isOpen, onClose, account, onSuccess }: AccountModalProps) {
  const { toast } = useToast();
  const isEditing = !!account;

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: isOpen,
  });

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      clientId: 0,
      accountType: "",
      programType: "",
      investmentObjective: "",
      approximateAccountValue: "0",
      checkwriting: false,
      debitCard: false,
      addMargin: false,
      optionsTrading: false,
      status: "active",
      ...account,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        clientId: account.clientId || 0,
        accountType: account.accountType || "",
        programType: account.programType || "",
        investmentObjective: account.investmentObjective || "",
        approximateAccountValue: account.approximateAccountValue || "0",
        checkwriting: account.checkwriting || false,
        debitCard: account.debitCard || false,
        addMargin: account.addMargin || false,
        optionsTrading: account.optionsTrading || false,
        status: account.status || "active",
      });
    } else {
      form.reset({
        clientId: 0,
        accountType: "",
        programType: "",
        investmentObjective: "",
        approximateAccountValue: "0",
        checkwriting: false,
        debitCard: false,
        addMargin: false,
        optionsTrading: false,
        status: "active",
      });
    }
  }, [account, form]);

  const mutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const url = isEditing ? `/api/accounts/${account.id}` : "/api/accounts";
      const method = isEditing ? "PUT" : "POST";
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
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
        description: `Failed to ${isEditing ? "update" : "create"} account`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{isEditing ? "Edit Account" : "Add New Account"}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                  Basic Information
                </h3>

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.firstName} {client.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Individual">Individual</SelectItem>
                          <SelectItem value="Joint">Joint</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Trust">Trust</SelectItem>
                          <SelectItem value="IRA">IRA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="programType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Investment Program" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="investmentObjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Objective</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select objective" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Growth">Growth</SelectItem>
                          <SelectItem value="Income">Income</SelectItem>
                          <SelectItem value="Balanced">Balanced</SelectItem>
                          <SelectItem value="Conservative">Conservative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="approximateAccountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approximate Account Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Account Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                  Account Features
                </h3>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="checkwriting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Checkwriting</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="debitCard"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Debit Card</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="addMargin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Add Margin</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="optionsTrading"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Options Trading</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Update Account" : "Save Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
