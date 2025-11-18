
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, PlusCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { PersonnelUpdate } from "@/entities/PersonnelUpdate";

const statuses = ["Hired", "Terminated", "Resigned"];

const ENTRIES_PER_PAGE = 10;
const MAX_ENTRIES_WARNING = 50;

const emptyEntry = {
  name: "",
  title_specialty: "",
  status: "",
  revenue_impact: "",
  notes: "",
  office_location: "",
};

export default function PersonnelForm({ submission, disabled, markets }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadEntries = async () => {
        if (submission?.region && submission?.month) {
            setLoading(true);
            const data = await PersonnelUpdate.filter({ region: submission.region, month: submission.month });
            setEntries(data);
            setLoading(false);
        }
    };
    loadEntries();
  }, [submission?.region, submission?.month]);

  const filteredEntries = entries.filter(entry => 
    entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.office_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.title_specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedEntries = showAll
    ? filteredEntries
    : filteredEntries.slice(0, currentPage * ENTRIES_PER_PAGE);

  const hasMoreEntries = filteredEntries.length > paginatedEntries.length;
  
  const handleUpdate = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };
  
  const handleSave = async (index) => {
    const originalEntry = { ...entries[index] };

    if (!originalEntry.id && !originalEntry.name && !originalEntry.status && !originalEntry.office_location) {
        return;
    }

    const entryToSave = { ...originalEntry };
    const revenueImpact = parseFloat(entryToSave.revenue_impact);
    entryToSave.revenue_impact = isNaN(revenueImpact) ? 0 : revenueImpact;

    if (entryToSave.status === "Terminated" || entryToSave.status === "Resigned") {
        entryToSave.revenue_impact = -Math.abs(entryToSave.revenue_impact);
    } else if (entryToSave.status === "Hired") {
        entryToSave.revenue_impact = Math.abs(entryToSave.revenue_impact);
    }
    
    if (entryToSave.id) {
      await PersonnelUpdate.update(entryToSave.id, entryToSave);
    } else {
      if (!entryToSave.name) return;
      // Use the RMD's main submission ID for tracking if needed, but the primary identifiers are region and month
      const submissionId = submission.id || `regional-${submission.region}-${submission.month}`;
      const newEntry = await PersonnelUpdate.create({ 
        ...entryToSave, 
        submission_id: submissionId, 
        region: submission.region, 
        month: submission.month 
      });
      const newEntries = [...entries];
      newEntries[index] = newEntry;
      setEntries(newEntries);
    }
  };
  
  const addEntry = () => {
    if (entries.length >= MAX_ENTRIES_WARNING) {
      if (!confirm(`You have ${entries.length} entries. Adding more may slow down performance. Continue?`)) {
        return;
      }
    }
    setEntries([{ ...emptyEntry }, ...entries]); // Add to beginning of array
    setShowAll(true);
  };

  const removeEntry = async (index) => {
    const entry = entries[index];
    try {
      if (entry.id) {
        await PersonnelUpdate.delete(entry.id);
      }
      setEntries(entries.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to remove personnel entry:", error);
    }
  };
  
  if (loading) {
    return <Card className="shadow-lg"><CardContent className="p-6">Loading Personnel Updates...</CardContent></Card>
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-teal-600" />
            <div>
              <span className="text-slate-900">5. Notable Personnel Changes (&gt; $250K)</span>
              <p className="text-sm text-slate-600 mt-1 font-normal">
                This should only include brokerage staff with an estimated impact of over $250,000. Please use their pipeline as a reference.
              </p>
              {entries.length > MAX_ENTRIES_WARNING && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ High data volume detected ({entries.length} entries). Performance may be slower.
                </p>
              )}
            </div>
          </div>
          {!disabled && (
            <Button variant="outline" size="sm" onClick={addEntry}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length > 5 && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-100 rounded-lg">
            <div className="flex-1">
              <Input
                placeholder="Search by name, office, or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="whitespace-nowrap"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show All ({filteredEntries.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {searchTerm && (
          <div className="text-sm text-slate-600 bg-blue-50 p-2 rounded">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
        )}

        {paginatedEntries.map((entry, index) => (
          <div key={entry.id || `personnel-${index}`} className="p-4 border rounded-lg bg-slate-100 space-y-4 relative">
            {!disabled && (
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-500 hover:text-red-500" onClick={() => removeEntry(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Name</Label>
                <Input 
                  placeholder="Name" 
                  value={entry.name} 
                  onChange={e => handleUpdate(index, 'name', e.target.value)} 
                  disabled={disabled} 
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Status</Label>
                <Select value={entry.status} onValueChange={value => { handleUpdate(index, 'status', value); handleSave(index); }} disabled={disabled}>
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Title/Specialty</Label>
                <Input 
                  placeholder="Title/Specialty" 
                  value={entry.title_specialty || ''} 
                  onChange={e => handleUpdate(index, 'title_specialty', e.target.value)} 
                  disabled={disabled} 
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Office Location</Label>
                <Select value={entry.office_location} onValueChange={value => { handleUpdate(index, 'office_location', value); handleSave(index); }} disabled={disabled}>
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Office Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map(market => <SelectItem key={market} value={market}>{market}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Budgeted Revenue Impact</Label>
                <Input 
                  type="number" 
                  placeholder="Budgeted Revenue Impact" 
                  value={entry.revenue_impact || ''} 
                  onChange={e => handleUpdate(index, 'revenue_impact', e.target.value)} 
                  disabled={disabled} 
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Notes</Label>
              <Textarea 
                placeholder="Additional details about this personnel change..." 
                value={entry.notes} 
                onChange={e => handleUpdate(index, 'notes', e.target.value)} 
                disabled={disabled} 
                onBlur={() => handleSave(index)}
                className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400"
              />
            </div>
          </div>
        ))}
        
        {hasMoreEntries && !showAll && (
          <div className="text-center py-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="bg-blue-50 hover:bg-blue-100"
            >
              Load More Entries ({filteredEntries.length - paginatedEntries.length} remaining)
            </Button>
          </div>
        )}

        {entries.length === 0 && !loading && (
          <p className="text-slate-500 text-center py-4">No entries found for this period.</p>
        )}

        {filteredEntries.length === 0 && entries.length > 0 && searchTerm && (
          <p className="text-slate-500 text-center py-4">No entries match your search.</p>
        )}
      </CardContent>
    </Card>
  );
}
