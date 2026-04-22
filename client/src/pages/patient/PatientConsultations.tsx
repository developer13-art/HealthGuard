import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, MessageSquare, Calendar, Clock, CheckCircle, XCircle, Loader2, Search, Video, Building2 } from "lucide-react";
import { format } from "date-fns";

const SPECIALIZATIONS = [
  "All Specializations",
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Radiology",
  "Surgery",
  "Urology",
];

export default function PatientConsultations() {
  const { uid } = useWallet();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("All Specializations");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [requestReason, setRequestReason] = useState("");
  const [consultationType, setConsultationType] = useState<"text" | "video">("text");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: doctors, isLoading: loadingDoctors } = useQuery<any[]>({
    queryKey: ["/api/consultation/doctors"],
    enabled: !!uid,
    refetchInterval: 10000,
  });

  const { data: consultations, isLoading: loadingConsultations } = useQuery<any[]>({
    queryKey: ["/api/consultation/patient/requests"],
    enabled: !!uid,
    refetchInterval: 3000,
  });

  const requestMutation = useMutation({
    mutationFn: (data: { doctorId: string; reason: string; type: string }) =>
      apiRequest("POST", "/api/consultation/request", data),
    onSuccess: () => {
      toast({
        title: "Request Sent",
        description: "Your consultation request has been sent to the doctor",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consultation/patient/requests"] });
      setSelectedDoctor(null);
      setRequestReason("");
      setConsultationType("text");
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send consultation request",
        variant: "destructive",
      });
    },
  });

  const handleRequestConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !requestReason.trim()) return;

    requestMutation.mutate({
      doctorId: selectedDoctor.id,
      reason: requestReason,
      type: consultationType,
    });
  };

  const filteredDoctors = doctors?.filter((doctor) => {
    const matchesSearch =
      doctor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doctor.specialization && doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSpec =
      specializationFilter === "All Specializations" ||
      (doctor.specialization && doctor.specialization.toLowerCase().includes(specializationFilter.toLowerCase()));
    return matchesSearch && matchesSpec;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consultations</h1>
        <p className="text-muted-foreground">Browse doctors by specialization and request text or video consultations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Doctors</CardTitle>
              <CardDescription>All verified doctors on the platform — filter by specialization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or specialization..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-doctors"
                  />
                </div>
                <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                  <SelectTrigger className="sm:w-56" data-testid="select-specialization">
                    <SelectValue placeholder="Filter by specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingDoctors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDoctors && filteredDoctors.length > 0 ? (
                <div className="space-y-3">
                  {filteredDoctors.map((doctor) => (
                    <Card key={doctor.id} className="hover-elevate" data-testid={`card-doctor-${doctor.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{doctor.username}</h3>
                              {doctor.specialization && (
                                <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                              )}
                              {doctor.hospitalName && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {doctor.hospitalName}
                                </p>
                              )}
                              {doctor.yearsOfExperience && (
                                <p className="text-xs text-muted-foreground">
                                  {doctor.yearsOfExperience} years of experience
                                </p>
                              )}
                            </div>
                          </div>
                          <Dialog open={dialogOpen && selectedDoctor?.id === doctor.id} onOpenChange={(open) => {
                            if (!open) { setSelectedDoctor(null); setDialogOpen(false); }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => { setSelectedDoctor(doctor); setDialogOpen(true); }}
                                data-testid={`button-request-${doctor.id}`}
                              >
                                Request
                              </Button>
                            </DialogTrigger>
                            <DialogContent data-testid="dialog-request-consultation">
                              <DialogHeader>
                                <DialogTitle>Request Consultation</DialogTitle>
                                <DialogDescription>
                                  Send a consultation request to Dr. {doctor.username}
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleRequestConsultation} className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Consultation Type</Label>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setConsultationType("text")}
                                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                                        consultationType === "text"
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                      Text Chat
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConsultationType("video")}
                                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                                        consultationType === "video"
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                    >
                                      <Video className="h-4 w-4" />
                                      Video Call
                                    </button>
                                  </div>
                                  {consultationType === "video" && (
                                    <p className="text-xs text-muted-foreground">
                                      A secure video room will be created when the doctor accepts your request.
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="reason">Reason for Consultation</Label>
                                  <Textarea
                                    id="reason"
                                    placeholder="Describe your symptoms or reason for consultation..."
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    required
                                    rows={4}
                                    data-testid="input-consultation-reason"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="submit"
                                    disabled={requestMutation.isPending}
                                    className="flex-1"
                                    data-testid="button-submit-request"
                                  >
                                    {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {consultationType === "video" ? "Request Video Call" : "Send Request"}
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No doctors found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>Your consultation requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConsultations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : consultations && consultations.length > 0 ? (
                <div className="space-y-3">
                  {consultations.map((consultation) => (
                    <Card key={consultation.id} className="hover-elevate" data-testid={`card-consultation-${consultation.id}`}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Dr. {consultation.doctorName}</span>
                            {getStatusBadge(consultation.status)}
                          </div>
                          <div className="flex items-center gap-1">
                            {consultation.type === "video" ? (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Video className="h-3 w-3" /> Video
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <MessageSquare className="h-3 w-3" /> Chat
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {consultation.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {consultation.requestedAt && format(new Date(consultation.requestedAt), "MMM d, yyyy")}
                          </p>
                          {consultation.status === "accepted" && (
                            <div className="space-y-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => setLocation(`/patient/consultations/${consultation.id}/chat`)}
                                data-testid={`button-chat-${consultation.id}`}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Open Chat
                              </Button>
                              {consultation.type === "video" && consultation.videoRoomId && (
                                <Button
                                  size="sm"
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    window.open(
                                      `https://meet.jit.si/${consultation.videoRoomId}`,
                                      "_blank"
                                    )
                                  }
                                  data-testid={`button-video-${consultation.id}`}
                                >
                                  <Video className="h-3 w-3 mr-1" />
                                  Join Video Call
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No consultation requests yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
