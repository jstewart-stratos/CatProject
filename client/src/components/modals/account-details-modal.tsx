import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, User, Building, DollarSign, Shield, Users, FileText, Settings, Activity, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface AccountDetailsModalProps {
  account: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (account: any) => void;
}

export default function AccountDetailsModal({ account, isOpen, onClose, onEdit }: AccountDetailsModalProps) {
  const [, setLocation] = useLocation();
  
  // Fetch audit logs for this account
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: [`/api/audit-logs`, { entityType: 'account', entityId: account?.id }],
    enabled: !!account?.id && isOpen,
  });
  
  if (!account) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  const formatCurrency = (value: any) => {
    if (!value) return 'N/A';
    try {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numValue) ? value : `$${numValue.toLocaleString()}`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Safe access to nested client data
  const clientData = account.client || {};
  const clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'N/A';

  const handleEditAccount = () => {
    onClose(); // Close the modal first
    setLocation(`/account-form-enhanced?accountId=${account.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Account Details - {clientName}
          </DialogTitle>
          <Button onClick={handleEditAccount} className="ml-4">
            <Edit className="h-4 w-4 mr-2" />
            Edit Account
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Information */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-3">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Account ID:</span>
                <span className="text-sm text-slate-900">{account.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Account Type:</span>
                <Badge variant="secondary">{account.accountType || 'Individual'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Program Type:</span>
                <span className="text-sm text-slate-900">{account.programType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Registration:</span>
                <span className="text-sm text-slate-900">{account.registrationType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">IRA Type:</span>
                <span className="text-sm text-slate-900">{account.iraType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Status:</span>
                <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                  {account.status || 'Active'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Created:</span>
                <span className="text-sm text-slate-900">{formatDate(account.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-3">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Client ID:</span>
                <span className="text-sm text-slate-900">{account.clientId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Name:</span>
                <span className="text-sm text-slate-900">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Email:</span>
                <span className="text-sm text-slate-900">{clientData.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Phone:</span>
                <span className="text-sm text-slate-900">{clientData.homePhone || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Investment Details */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-3">
              <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
              <CardTitle className="text-lg">Investment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Investment Objective:</span>
                <span className="text-sm text-slate-900">{account.investmentObjective || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Approximate Value:</span>
                <span className="text-sm text-slate-900">{account.approximateAccountValue || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Expected Value:</span>
                <span className="text-sm text-slate-900">{formatCurrency(account.expectedAccountValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Time Horizon:</span>
                <span className="text-sm text-slate-900">{account.investmentTimeHorizon || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Funds Needed In:</span>
                <span className="text-sm text-slate-900">{account.fundsNeededIn || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Account Features */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-3">
              <Settings className="h-5 w-5 text-purple-600 mr-2" />
              <CardTitle className="text-lg">Account Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Checkwriting:</span>
                <Badge variant={account.checkwriting ? 'default' : 'secondary'}>
                  {account.checkwriting ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Debit Card:</span>
                <Badge variant={account.debitCard ? 'default' : 'secondary'}>
                  {account.debitCard ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Cost Basis Reporting:</span>
                <Badge variant={account.costBasisReporting ? 'default' : 'secondary'}>
                  {account.costBasisReporting ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Transfer On Death:</span>
                <Badge variant={account.transferOnDeath ? 'default' : 'secondary'}>
                  {account.transferOnDeath ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Trading Authority */}
          {(account.tradingAuthority || account.powerOfAttorney) && (
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                <Shield className="h-5 w-5 text-red-600 mr-2" />
                <CardTitle className="text-lg">Authority & Power of Attorney</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.tradingAuthority && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-slate-600">Trading Authority:</span>
                      <Badge variant="default">Granted</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-slate-600">Authorized Agent:</span>
                      <span className="text-sm text-slate-900">{account.taAuthorizedAgentName || 'N/A'}</span>
                    </div>
                  </>
                )}
                {account.powerOfAttorney && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-slate-600">Power of Attorney:</span>
                      <Badge variant="default">Granted</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-slate-600">POA Agent:</span>
                      <span className="text-sm text-slate-900">{account.poaAuthorizedAgentName || 'N/A'}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trading Options */}
          {(account.addFullDiscretionaryTrading || account.addStructuredProductTrading || account.tradeComplexETPs || account.addOptionsTrading) && (
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                <Building className="h-5 w-5 text-orange-600 mr-2" />
                <CardTitle className="text-lg">Trading Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.addFullDiscretionaryTrading && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Discretionary Trading:</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                )}
                {account.addStructuredProductTrading && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Structured Products:</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                )}
                {account.tradeComplexETPs && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Complex ETPs:</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                )}
                {account.addOptionsTrading && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Options Trading:</span>
                    <Badge variant="default">Level {account.optionsLevel || 1}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          {account.notes && (
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                <FileText className="h-5 w-5 text-gray-600 mr-2" />
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{account.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail Section */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center space-y-0 pb-3">
              <Activity className="h-5 w-5 text-blue-600 mr-2" />
              <CardTitle className="text-lg">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : auditLogs && Array.isArray(auditLogs) && auditLogs.length > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {auditLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-start space-x-4 border-b border-slate-200 pb-4 last:border-b-0">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Activity className="w-3 h-3 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">
                            {log.summary || log.action}
                          </p>
                          <div className="flex items-center text-xs text-slate-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(new Date(log.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                        {log.userName && (
                          <div className="flex items-center mt-1">
                            <User className="w-3 h-3 text-slate-400 mr-1" />
                            <span className="text-xs text-slate-500">
                              by {log.userName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {auditLogs.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-xs text-slate-500">
                        Showing recent 5 of {auditLogs.length} total changes
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No audit history found for this account.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}