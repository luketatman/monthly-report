
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { Region } from '@/entities/Region';

export default function RegionManagement({ regions, onRegionsUpdated }) {
  const [editingRegion, setEditingRegion] = useState(null);
  const [newRegion, setNewRegion] = useState({ name: '', managing_director: '', markets: [] });
  const [marketInput, setMarketInput] = useState('');

  const handleAddMarket = () => {
    if (marketInput.trim()) {
      setNewRegion(prev => ({
        ...prev,
        markets: [...prev.markets, marketInput.trim()]
      }));
      setMarketInput('');
    }
  };

  const handleRemoveMarket = (index) => {
    setNewRegion(prev => ({
      ...prev,
      markets: prev.markets.filter((_, i) => i !== index)
    }));
  };

  const handleSaveRegion = async () => {
    if (!newRegion.name || !newRegion.managing_director) return;

    try {
      if (editingRegion) {
        // Update existing region
        await Region.update(editingRegion.id, newRegion);
        setEditingRegion(null);
      } else {
        // Create new region
        await Region.create(newRegion);
      }
      setNewRegion({ name: '', managing_director: '', markets: [] });
      onRegionsUpdated();
    } catch (error) {
      console.error('Error saving region:', error);
    }
  };

  const handleEditRegion = (region) => {
    setEditingRegion(region);
    setNewRegion({
      name: region.name,
      managing_director: region.managing_director,
      markets: [...(region.markets || [])]
    });
  };

  const handleCancelEdit = () => {
    setEditingRegion(null);
    setNewRegion({ name: '', managing_director: '', markets: [] });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-slate-700 border-slate-600">
        <CardHeader className="bg-slate-700">
          <CardTitle className="flex items-center gap-3 text-white">
            <Building2 className="text-blue-400" />
            <span>{editingRegion ? 'Edit Region' : 'Create New Region'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 bg-slate-700">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Region Name"
              value={newRegion.name}
              onChange={(e) => setNewRegion(prev => ({ ...prev, name: e.target.value }))}
              className="text-black bg-white border-slate-600"
            />
            <Input
              placeholder="Managing Director Email"
              value={newRegion.managing_director}
              onChange={(e) => setNewRegion(prev => ({ ...prev, managing_director: e.target.value }))}
              className="text-black bg-white border-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Markets</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add market"
                value={marketInput}
                onChange={(e) => setMarketInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMarket()}
                className="text-black bg-white border-slate-600"
              />
              <Button onClick={handleAddMarket} variant="outline" className="bg-slate-600 text-white border-slate-500 hover:bg-slate-500">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {newRegion.markets.map((market, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-slate-600 text-white">
                  {market}
                  <button onClick={() => handleRemoveMarket(index)} className="ml-1 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSaveRegion} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {editingRegion ? 'Update Region' : 'Create Region'}
            </Button>
            {editingRegion && (
              <Button onClick={handleCancelEdit} variant="outline" className="bg-slate-600 text-white border-slate-500 hover:bg-slate-500">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-700 text-white rounded-lg border-slate-600 shadow-lg">
        <CardHeader className="bg-slate-700">
          <CardTitle className="text-white">Existing Regions</CardTitle>
        </CardHeader>
        <CardContent className="bg-slate-700">
          <div className="space-y-4">
            {regions.map((region) => (
              <div key={region.id} className="p-4 border border-slate-600 rounded-lg bg-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-white">{region.name}</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditRegion(region)}
                      className="bg-slate-600 text-white border-slate-500 hover:bg-slate-500"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2">MD: {region.managing_director}</p>
                <div className="flex flex-wrap gap-2">
                  {region.markets?.map((market, index) => (
                    <Badge key={index} variant="outline" className="text-slate-200 border-slate-500">{market}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
