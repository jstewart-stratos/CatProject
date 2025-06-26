import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, User, Building, DollarSign, Shield, Users, FileText, Settings } from "lucide-react";

interface AccountDetailsModalProps {
  account: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (account: any) => void;
}

export default function AccountDetailsModal({ account, isOpen, onClose, onEdit }: AccountDetailsModalProps) {
  if (!account) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value: any) => {
    if (!value) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? value : `$${numValue.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Account Details - {account.client?.firstName} {account.client?.lastName}
          </DialogTitle>
          <Button onClick={() => onEdit(account)} className="ml-4">
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
                <span className="text-sm text-slate-900">
                  {account.client?.firstName} {account.client?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Email:</span>
                <span className="text-sm text-slate-900">{account.client?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Phone:</span>
                <span className="text-sm text-slate-900">{account.client?.homePhone || 'N/A'}</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}