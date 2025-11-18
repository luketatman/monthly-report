
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function SubmissionTracking({ submissions, regions, onSubmissionsUpdated }) {
  const getStatusBadge = (status) => {
    const config = {
      submitted: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      draft: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      reviewed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    };

    const statusConfig = config[status] || config.draft;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRegionName = (regionId) => {
    const region = regions.find(r => r.id === regionId);
    return region ? region.name : regionId;
  };

  return (
    <Card className="shadow-lg bg-slate-700 border-slate-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <FileText className="text-blue-400" />
          <span className="text-white">Submission Tracking</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-slate-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Region</TableHead>
                <TableHead className="text-white">Managing Director</TableHead>
                <TableHead className="text-white">Month</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? (
                submissions.map((submission) => (
                  <TableRow key={submission.id} className="border-slate-600">
                    <TableCell className="font-medium text-white">{submission.region}</TableCell>
                    <TableCell className="text-slate-200">{submission.managing_director}</TableCell>
                    <TableCell className="text-slate-200">
                      {format(new Date(submission.month + '-01'), 'MMMM yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell className="text-slate-200">
                      {submission.submitted_at ? 
                        format(new Date(submission.submitted_at), 'MMM d, yyyy') : 
                        'Not submitted'
                      }
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-slate-400">
                    No submissions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
