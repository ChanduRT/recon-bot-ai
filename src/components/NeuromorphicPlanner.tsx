import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, Shield, Swords, TrendingUp, Clock, DollarSign, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NeuromorphicPlannerProps {
  scenario: {
    topology: string[];
    assets: string[];
    vulnerabilities: string[];
    constraints: string[];
  };
}

export const NeuromorphicPlanner = ({ scenario }: NeuromorphicPlannerProps) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'attack' | 'defense'>('attack');
  const [results, setResults] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const runNeuromorphicPlanning = async (planningMode: 'attack' | 'defense') => {
    setLoading(true);
    setMode(planningMode);
    
    try {
      toast.info(`Initializing neuromorphic inference for ${planningMode} planning...`);
      
      const { data, error } = await supabase.functions.invoke('neuromorphic-planner', {
        body: { scenario, mode: planningMode }
      });

      if (error) throw error;

      setResults(data);
      if (data.plans && data.plans.length > 0) {
        setSelectedPlan(data.plans[0]);
      }
      
      toast.success(`Generated ${data.plans.length} ${planningMode} plans using neuromorphic inference`);
    } catch (error) {
      console.error('Neuromorphic planning error:', error);
      toast.error('Failed to run neuromorphic planning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <CardTitle>Neuromorphic Planning System</CardTitle>
          </div>
          <CardDescription>
            Inference-only planning using neuromorphic decision engines (no training/learning)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={() => runNeuromorphicPlanning('attack')}
              disabled={loading}
              className="flex-1"
              variant={mode === 'attack' ? 'default' : 'outline'}
            >
              <Swords className="mr-2 h-4 w-4" />
              Generate Attack Plans
            </Button>
            <Button
              onClick={() => runNeuromorphicPlanning('defense')}
              disabled={loading}
              className="flex-1"
              variant={mode === 'defense' ? 'default' : 'outline'}
            >
              <Shield className="mr-2 h-4 w-4" />
              Generate Defense Plans
            </Button>
          </div>
          
          {loading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 animate-pulse text-primary" />
                <span>Neuromorphic inference in progress...</span>
              </div>
              <Progress value={66} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Processing spike trains, activating hidden layers, generating decisions...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Inference Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Inference Time</p>
                  <p className="text-2xl font-bold">{results.metadata.inferenceTime}ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plans Generated</p>
                  <p className="text-2xl font-bold">{results.metadata.plansGenerated}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Neural Activations</p>
                  <p className="text-2xl font-bold">{results.metadata.neuromorphicActivations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plans */}
          <Tabs defaultValue="plans" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plans">Ranked Plans</TabsTrigger>
              <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
              <TabsTrigger value="visualization">Neural Activity</TabsTrigger>
            </TabsList>

            {/* Ranked Plans */}
            <TabsContent value="plans" className="space-y-4">
              <div className="grid gap-4">
                {results.plans.map((plan: any, idx: number) => (
                  <Card 
                    key={plan.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedPlan?.id === plan.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {mode === 'attack' ? '🎯 ' : '🛡️ '}Plan #{idx + 1}
                          </CardTitle>
                          <CardDescription>
                            {mode === 'attack' ? plan.objective : plan.threatModel}
                          </CardDescription>
                        </div>
                        <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                          Rank #{idx + 1}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {mode === 'attack' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              Success Probability
                            </div>
                            <p className="text-lg font-semibold">{(plan.successProbability * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Time to Compromise
                            </div>
                            <p className="text-lg font-semibold">{plan.timeToCompromise.toFixed(1)}h</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Activity className="h-3 w-3" />
                              Detection Likelihood
                            </div>
                            <p className="text-lg font-semibold">{(plan.detectionLikelihood * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Zap className="h-3 w-3" />
                              Risk Score
                            </div>
                            <p className="text-lg font-semibold text-destructive">{plan.overallRisk.toFixed(1)}/10</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Shield className="h-3 w-3" />
                              Effectiveness
                            </div>
                            <p className="text-lg font-semibold">{(plan.effectiveness * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              Implementation Cost
                            </div>
                            <p className="text-lg font-semibold">${(plan.implementationCost / 1000).toFixed(1)}K</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Activity className="h-3 w-3" />
                              Detection Capability
                            </div>
                            <p className="text-lg font-semibold">{(plan.detectionCapability * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Response Time
                            </div>
                            <p className="text-lg font-semibold">{plan.responseTime.toFixed(1)}h</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Plan Details */}
                      {selectedPlan?.id === plan.id && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <h4 className="font-semibold text-sm">
                            {mode === 'attack' ? 'Attack Phases:' : 'Defense Mitigations:'}
                          </h4>
                          <div className="space-y-2">
                            {(mode === 'attack' ? plan.phases : plan.mitigations).map((item: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 text-sm bg-muted/50 p-3 rounded">
                                <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {mode === 'attack' ? item.action : item.control} - {mode === 'attack' ? item.method : item.action}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {mode === 'attack' ? item.timing : item.timing}
                                    {' • '}
                                    Neuromorphic {mode === 'attack' ? 'activation' : 'confidence'}: {
                                      ((mode === 'attack' ? item.neuromorphicActivation : item.neuromorphicConfidence) * 100).toFixed(1)
                                    }%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Playbooks */}
            <TabsContent value="playbooks" className="space-y-4">
              {results.playbooks.map((playbook: any) => (
                <Card key={playbook.playbookId}>
                  <CardHeader>
                    <CardTitle>{playbook.title}</CardTitle>
                    <CardDescription>{playbook.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {playbook.steps.map((step: any) => (
                        <div key={step.stepNumber} className="border-l-2 border-primary/30 pl-4 py-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                Step {step.stepNumber}: {step.action || step.control}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {step.method || step.action} • {step.timing}
                              </p>
                              {step.priority && (
                                <Badge variant="outline" className="mt-2">{step.priority}</Badge>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {step.neuromorphicScore || step.confidence}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Generated: {new Date(playbook.metadata.generated).toLocaleString()} • 
                        Mode: {playbook.metadata.mode} • 
                        Priority: #{playbook.metadata.priority}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Visualization */}
            <TabsContent value="visualization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Neuromorphic Inference Activity</CardTitle>
                  <CardDescription>
                    Spike patterns and neural activations during inference (no training)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Input Spikes */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Input Layer Spike Train
                    </h4>
                    <div className="h-32 bg-muted/30 rounded p-4 overflow-auto">
                      <div className="flex gap-1 h-full items-end">
                        {results.visualization.inputSpikes.map((spike: any, i: number) => (
                          <div
                            key={i}
                            className="bg-primary/70 w-2 rounded-t transition-all hover:bg-primary animate-pulse"
                            style={{ 
                              height: `${spike.amplitude * 100}%`,
                              animationDelay: `${i * 0.05}s`,
                              animationDuration: '1.5s'
                            }}
                            title={`Neuron ${spike.neuronId} @ t=${spike.time.toFixed(1)}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hidden Layer */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Hidden Layer Activations
                    </h4>
                    <div className="grid grid-cols-10 gap-2">
                      {results.visualization.hiddenActivations.map((activation: any) => (
                        <div
                          key={activation.neuronId}
                          className={`h-12 rounded flex items-center justify-center text-xs font-mono transition-all duration-500 ${
                            activation.fired ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-muted'
                          }`}
                          style={{
                            transform: activation.fired ? 'scale(1.1)' : 'scale(1)',
                            boxShadow: activation.fired ? '0 0 15px rgba(155, 135, 245, 0.5)' : 'none'
                          }}
                          title={`N${activation.neuronId}: ${activation.activation.toFixed(3)}`}
                        >
                          {activation.neuronId}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Output Decisions */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Output Decision Scores
                    </h4>
                    <div className="space-y-2">
                      {results.visualization.outputDecisions.map((decision: any) => (
                        <div key={decision.actionId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">{decision.category}</span>
                            <span className="font-mono text-xs font-bold">{(decision.score * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                            <div
                              className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                              style={{ 
                                width: `${decision.score * 100}%`,
                                background: decision.score > 0.7 
                                  ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(262 83% 85%))' 
                                  : 'hsl(var(--primary))',
                              }}
                            >
                              <div 
                                className="absolute inset-0 animate-shimmer"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    <p>
                      ⚡ Inference-only mode: All weights are fixed, no learning or updates occur.
                      This visualization shows deterministic decision-making using pre-configured neuromorphic patterns.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};
