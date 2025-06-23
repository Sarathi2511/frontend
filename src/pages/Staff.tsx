// Staff Page
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import {
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  User,
  UserCog,
  UserPlus,
  Users,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User as UserType, UserRole } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStaff, createStaff, updateStaff, deleteStaff, recordAttendance, getStaffAttendance, getAllStaffAttendanceByDate } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile, useIsSmallMobile } from '@/hooks/use-mobile';

// Use memoization for staff card component
const StaffCard = React.memo(({ staff, onEdit, onDelete }) => {
  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit(staff);
  }, [staff, onEdit]);
  
  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(staff);
  }, [staff, onDelete]);
  
  return (
    <div className="border rounded-md p-4 bg-card hover:bg-muted/50 transition-colors will-change-transform">
      {/* Card content */}
    </div>
  );
});

StaffCard.displayName = 'StaffCard';

export default function Staff() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<UserType[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<UserType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form states
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('staff');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Attendance state
  const [activeTab, setActiveTab] = useState('members');
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffAttendance, setStaffAttendance] = useState<{
    staffId: string;
    name: string;
    isPresent: boolean | null;
    remarks: string;
  }[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [selectedAttendanceStaff, setSelectedAttendanceStaff] = useState<string | null>(null);
  const [attendanceRemarks, setAttendanceRemarks] = useState('');
  const [isShowingAttendanceDialog, setIsShowingAttendanceDialog] = useState(false);
  
  // Mobile and small mobile detection
  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();
  
  // Fetch staff data on component mount
  useEffect(() => {
    loadStaff();
  }, []);
  
  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const staffData = await fetchStaff();
      setStaff(staffData);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setStaffName('');
    setStaffPhone('');
    setStaffRole('staff');
    setStaffEmail('');
    setStaffPassword('');
    setShowPassword(false);
    setIsEditing(false);
    setSelectedStaff(null);
  };

  const handleOpenStaffForm = (staff?: UserType) => {
    if (staff) {
      setSelectedStaff(staff);
      setStaffName(staff.name);
      setStaffPhone(staff.phone);
      setStaffRole(staff.role);
      setStaffEmail(staff.email || '');
      setStaffPassword(''); // Reset password field when editing
      setIsEditing(true);
      console.log('Opening edit form for staff:', staff); // Debug log
    } else {
      resetForm();
    }
    setIsStaffFormOpen(true);
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      console.log('Deleting staff with ID:', staffId);
      await deleteStaff(staffId);
      setStaff(staff.filter(s => s._id !== staffId && s.id !== staffId));
      setIsDeleteDialogOpen(false);
      toast.success('Staff member deleted successfully');
    } catch (error) {
      console.error('Error in handleDeleteStaff:', error);
      toast.error('Failed to delete staff member');
    }
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate role
      if (!['admin', 'staff', 'executive'].includes(staffRole)) {
        throw new Error(`Invalid role selected. Please choose a valid role from the dropdown.`);
      }

      if (isEditing && selectedStaff) {
        console.log('Updating staff with ID:', selectedStaff._id || selectedStaff.id);
        // Update existing staff
        const updates: Partial<UserType> = {
          name: staffName,
          phone: staffPhone,
          role: staffRole,
          email: staffEmail || undefined,
        };
        
        // Only update password if one was provided
        if (staffPassword) {
          updates.password = staffPassword;
        }
        
        const staffId = selectedStaff._id || selectedStaff.id;
        if (!staffId) {
          throw new Error('Staff ID is required for updating');
        }
        
        const updatedStaff = await updateStaff(staffId, updates);
        setStaff(staff.map(s => (s._id === staffId || s.id === staffId) ? updatedStaff : s));
        toast.success('Staff member updated successfully');
      } else {
        // Add new staff with required password
        if (!staffPassword) {
          toast.error('Password is required for new staff members');
          return;
        }
        
        const newStaff = await createStaff({
          name: staffName,
          phone: staffPhone,
          role: staffRole,
          email: staffEmail || undefined,
          password: staffPassword,
        });
        
        console.log('New staff created:', newStaff);
        
        // Ensure the new staff has id property for client-side operations
        if (newStaff._id && !newStaff.id) {
          newStaff.id = newStaff._id;
        }
        
        setStaff([newStaff, ...staff]);
        toast.success('Staff member added successfully');
      }
      
      setIsStaffFormOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting staff:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid role')) {
          setError('Please select a valid role from the dropdown menu');
        } else if (error.message.includes('Duplicate')) {
          setError('A staff member with this phone number already exists');
        } else if (error.message.includes('permission')) {
          setError('You do not have permission to perform this action');
        } else {
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimize data filtering with useMemo
  const filteredStaff = useMemo(() => {
    return staff.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, searchTerm]);

  // Fetch staff attendance data for the selected date
  const loadAttendanceData = async () => {
    try {
      setIsAttendanceLoading(true);
      const attendanceData = await getAllStaffAttendanceByDate(attendanceDate);
      console.log('Loaded attendance data:', attendanceData);
      
      // Check if we received the expected data structure
      if (!attendanceData || !attendanceData.staffAttendance) {
        console.error('Unexpected attendance data format:', attendanceData);
        toast.error('Received unexpected data format from the server');
        setIsAttendanceLoading(false);
        return;
      }
      
      // Map attendance data to staff members
      const mappedAttendance = attendanceData.staffAttendance.map((record: any) => {
        return {
          staffId: record.staffId,
          name: record.name,
          isPresent: record.attendance?.isPresent ?? null,
          remarks: record.attendance?.remarks || '',
        };
      });
      
      console.log('Mapped attendance data:', mappedAttendance);
      setStaffAttendance(mappedAttendance);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setIsAttendanceLoading(false);
    }
  };
  
  // Load attendance data when date changes or staff list is updated
  useEffect(() => {
    if (activeTab === 'attendance' && staff.length > 0) {
      loadAttendanceData();
    }
  }, [attendanceDate, staff, activeTab]);
  
  // Handle marking attendance
  const handleMarkAttendance = async (staffId: string, isPresent: boolean) => {
    try {
      console.log(`Marking ${isPresent ? 'present' : 'absent'} for staff ID ${staffId} on ${attendanceDate}`);
      
      // Find the current staff member in the attendance state
      const currentStaffAttendance = staffAttendance.find(a => a.staffId === staffId);
      
      // If attendance is already marked and same status, don't update
      if (currentStaffAttendance && currentStaffAttendance.isPresent === isPresent) {
        return;
      }
      
      const attendanceData = {
        date: attendanceDate,
        isPresent,
        remarks: currentStaffAttendance?.remarks || '',
      };
      
      // Update attendance on the server
      await recordAttendance(staffId, attendanceData);
      
      // Update local state
      setStaffAttendance(prevState =>
        prevState.map(a =>
          a.staffId === staffId ? { ...a, isPresent } : a
        )
      );
      
      toast.success(`Marked ${isPresent ? 'present' : 'absent'} successfully`);
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      toast.error('Failed to update attendance');
    }
  };
  
  // Handle opening the remarks dialog
  const handleOpenRemarksDialog = (staffId: string) => {
    const staff = staffAttendance.find(a => a.staffId === staffId);
    setSelectedAttendanceStaff(staffId);
    setAttendanceRemarks(staff?.remarks || '');
    setIsShowingAttendanceDialog(true);
  };
  
  // Handle saving attendance remarks
  const handleSaveRemarks = async () => {
    if (!selectedAttendanceStaff) return;
    
    try {
      const staff = staffAttendance.find(a => a.staffId === selectedAttendanceStaff);
      
      if (!staff) {
        throw new Error('Staff not found');
      }
      
      const attendanceData = {
        date: attendanceDate,
        isPresent: staff.isPresent === null ? true : staff.isPresent, // Default to present if not marked
        remarks: attendanceRemarks,
      };
      
      // Update attendance on the server
      await recordAttendance(selectedAttendanceStaff, attendanceData);
      
      // Update local state
      setStaffAttendance(prevState =>
        prevState.map(a =>
          a.staffId === selectedAttendanceStaff ? { ...a, remarks: attendanceRemarks } : a
        )
      );
      
      setIsShowingAttendanceDialog(false);
      toast.success('Remarks saved successfully');
    } catch (error) {
      console.error('Failed to save remarks:', error);
      toast.error('Failed to update remarks');
    }
  };

  // Update the role options in the form
  const roleOptions = [
    { value: 'staff', label: 'Staff Member' },
    { value: 'executive', label: 'Executive' },
    { value: 'admin', label: 'Administrator' },
  ];

  // Use passive scroll listeners
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Scroll handling logic
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight animate-fade-in">Staff Management</h1>
          <p className="text-muted-foreground animate-slide-in-bottom">
            Manage your staff members and their access permissions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Staff Members</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="members" className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search staff..."
                  className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
              <Button onClick={() => handleOpenStaffForm()} className="w-full md:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
                {!isSmallMobile ? 'Add Staff Member' : 'Add Staff'}
          </Button>
        </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No staff members found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchTerm
                    ? "Try adjusting your search query"
                    : "Add your first staff member to get started"}
                </p>
              </div>
            ) : isMobile ? (
              // Mobile card view for staff members
              <div className="space-y-4">
                {filteredStaff.map((member) => (
                  <div 
                    key={member.id}
                    className="border rounded-lg p-4 shadow-sm hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">{member.phone}</p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenStaffForm(member)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(member);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <Badge 
                          variant={
                            member.role === 'admin' 
                              ? 'default' 
                              : member.role === 'executive'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {member.role === 'admin' 
                            ? 'Administrator' 
                            : member.role === 'executive'
                              ? 'Executive'
                              : 'Staff Member'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p>{member.phone || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Joined</p>
                        <p>{member.createdAt ? format(new Date(member.createdAt), 'PP') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Desktop table view
              <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                              <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                            <span>{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                          <Badge 
                            variant={
                              member.role === 'admin' 
                                ? 'default' 
                                : member.role === 'executive'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {member.role === 'admin' 
                              ? 'Administrator' 
                              : member.role === 'executive'
                                ? 'Executive'
                                : 'Staff Member'}
                          </Badge>
                      </TableCell>
                      <TableCell>{member.phone || 'N/A'}</TableCell>
                      <TableCell>{member.email || 'N/A'}</TableCell>
                      <TableCell>{member.createdAt ? format(new Date(member.createdAt), 'PP') : 'N/A'}</TableCell>
                      <TableCell>
                          <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenStaffForm(member)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedStaff(member);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                          </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="attendance" className="space-y-4">
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 items-center justify-between`}>
              <div className="w-full md:w-auto">
                <Label htmlFor="attendance-date" className="mb-2 block">Select Date</Label>
                <Input
                  id="attendance-date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full md:w-auto"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="py-1 px-3">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(attendanceDate), 'PP')}
                </Badge>
                
                <Badge variant="outline" className="py-1 px-3">
                  <Users className="h-4 w-4 mr-2" />
                  {staffAttendance.length} Staff
                </Badge>
              </div>
            </div>

            {isAttendanceLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : staffAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No staff members found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Add staff members to record their attendance
                </p>
              </div>
            ) : isMobile ? (
              // Mobile card view for attendance
              <div className="space-y-4">
                {staffAttendance.map((record) => (
                  <div 
                    key={record.staffId}
                    className="border rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{record.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{record.name}</span>
                      </div>
                      
                      <Badge 
                        variant={record.isPresent === null ? "outline" : record.isPresent ? "default" : "destructive"}
                        className="py-1 px-3"
                      >
                        {record.isPresent === null 
                          ? "Not Marked" 
                          : record.isPresent 
                            ? "Present" 
                            : "Absent"
                        }
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={record.isPresent === true ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => handleMarkAttendance(record.staffId, true)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Present
                        </Button>
                        
                        <Button 
                          variant={record.isPresent === false ? "destructive" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => handleMarkAttendance(record.staffId, false)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Absent
                        </Button>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleOpenRemarksDialog(record.staffId)}
                      >
                        {record.remarks ? "Edit Remarks" : "Add Remarks"}
                      </Button>
                      
                      {record.remarks && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <p className="text-xs text-muted-foreground mb-1">Remarks:</p>
                          <p>{record.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Desktop table view for attendance
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffAttendance.map((record) => (
                      <TableRow key={record.staffId}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{record.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{record.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.isPresent === null ? "outline" : record.isPresent ? "default" : "destructive"}
                          >
                            {record.isPresent === null 
                              ? "Not Marked" 
                              : record.isPresent 
                                ? "Present" 
                                : "Absent"
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant={record.isPresent === true ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleMarkAttendance(record.staffId, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Present
                            </Button>
                            <Button 
                              variant={record.isPresent === false ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleMarkAttendance(record.staffId, false)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Absent
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between max-w-xs">
                            <div className="truncate max-w-[200px]">
                              {record.remarks || <span className="text-muted-foreground italic">No remarks</span>}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenRemarksDialog(record.staffId)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Staff Form Dialog */}
      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update staff member details below.'
                : 'Fill in the details to add a new staff member.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={staffRole}
                onValueChange={(value: UserRole) => setStaffRole(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEditing ? 'New Password (Optional)' : 'Password'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required={!isEditing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {isEditing ? 'Update Staff Member' : 'Add Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this staff member? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedStaff && handleDeleteStaff(selectedStaff._id || selectedStaff.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Attendance Remarks Dialog */}
      <Dialog open={isShowingAttendanceDialog} onOpenChange={setIsShowingAttendanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Attendance Remarks</DialogTitle>
            <DialogDescription>
              Add notes or details about this staff member's attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={attendanceRemarks}
                onChange={(e) => setAttendanceRemarks(e.target.value)}
                placeholder="Enter attendance remarks or leave empty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShowingAttendanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRemarks}>
              Save Remarks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
