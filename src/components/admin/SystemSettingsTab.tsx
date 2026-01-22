import { useEffect, useState } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SystemSettingsTab() {
    const { maintenanceMode, loading, setMaintenanceStatus } = useSystemSettings();
    const [message, setMessage] = useState("");
    const [enabled, setEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading) {
            setEnabled(maintenanceMode.enabled);
            setMessage(maintenanceMode.message || "Sistema em manutenção");
        }
    }, [maintenanceMode, loading]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await setMaintenanceStatus(enabled, message);
            toast({
                title: "Configurações salvas",
                description: `Modo de manutenção ${enabled ? 'ATIVADO' : 'DESATIVADO'} com sucesso.`,
                variant: "default",
            });
        } catch (error) {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível atualizar as configurações.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div>Carregando configurações...</div>;

    return (
        <div className="space-y-6">
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Modo de Manutenção
                    </CardTitle>
                    <CardDescription>
                        Quando ativo, impede o acesso de todos os usuários (exceto administradores) ao sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="maintenance-mode" className="flex flex-col space-y-1">
                            <span>Ativar Manutenção</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                O site ficará inacessível para usuários comuns imediatamente.
                            </span>
                        </Label>
                        <Switch
                            id="maintenance-mode"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Mensagem de Aviso</Label>
                        <Input
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ex: Estamos realizando melhorias..."
                            disabled={!enabled}
                        />
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full sm:w-auto"
                        >
                            {isSaving ? (
                                <>Salvando...</>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Save Alterações
                                </>
                            )}
                        </Button>
                    </div>

                    {enabled && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Atenção</AlertTitle>
                            <AlertDescription>
                                O sistema está atualmente bloqueado para usuários comuns. Você (como Master) ainda tem acesso.
                            </AlertDescription>
                        </Alert>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
