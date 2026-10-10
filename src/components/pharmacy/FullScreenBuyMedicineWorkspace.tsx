import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  MapPin,
  Clock,
  Truck,
  Search,
  Star,
  Package,
  Plus,
  Minus,
  X,
  Upload,
  Eye,
  RefreshCw,
  Radio,
  CreditCard,
  Lock,
  Check,
  Award,
  DollarSign,
  Calendar,
  Phone,
  User,
  Home,
  Trash2,
  Tag,
  Zap,
  Info,
  AlertCircle,
} from 'lucide-react';
import { PharmacyProduct, CartItem, UploadedPrescription, PharmacyOrder, PartnerAvailabilityOption } from '../../types/pharmacyMarketplace';
import { fetchProductAvailability, validateInventoryItems, placeMarketplaceOrder } from '../../services/pharmacyInventoryClient';
import { usePatientEhr } from '../../context/PatientEhrContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Full-Screen Buy Medicine Workspace — Complete Blueprint Implementation
 * Sections 1-36 of the spec.
 */

interface DeliveryAddress {
  id: string;
  label: string;
  fullName: string;
  mobile: string;
  house: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  instructions?: string;
  isDefault?: boolean;
}

type PurchaseStep = 1 | 2 | 3 | 4;
type PrescriptionVerificationState = 'idle' | 'pending' | 'verified' | 'rejected';
type PaymentMethod = 'UPI' | 'Credit / Debit Card' | 'Net Banking' | 'Cash on Delivery';
type DeliveryMethod = 'standard' | 'express' | 'scheduled';

interface FullScreenBuyMedicineWorkspaceProps {
  product: PharmacyProduct;
  onBack: () => void;
  cartItems: CartItem[];
  onUpdateCartQuantity: (productId: string, qty: number) => void;
  onRemoveCartItem: (productId: string) => void;
  onOrderPlaced: (order: PharmacyOrder) => void;
  onNavigateToOrders?: () => void;
  uploadedPrescriptions: UploadedPrescription[];
  isAuthenticated: boolean;
  onRequireAuth: (feature: string) => void;
  initialQuantity?: number;
  // Variant support: buy (from medicine card Buy Now) vs stock (from monograph Check Pharmacy Stock)
  mode?: 'buy' | 'stock';
  backLabel?: string;
  titleOverride?: string;
  subtitleOverride?: string;
  // When opened from clinical monograph, preserve full monograph data for richer display
  originMedicine?: {
    name: string;
    genericName: string;
    category: string;
    therapeuticGroup?: string;
    dosageForms?: string[];
    prescriptionStatus?: string;
    overTheCounter?: boolean;
  };
}

export const FullScreenBuyMedicineWorkspace: React.FC<FullScreenBuyMedicineWorkspaceProps> = ({
  product,
  onBack,
  cartItems,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onOrderPlaced,
  onNavigateToOrders,
  uploadedPrescriptions,
  isAuthenticated,
  onRequireAuth,
  initialQuantity = 1,
  mode = 'buy',
  backLabel,
  titleOverride,
  subtitleOverride,
  originMedicine,
}) => {
  const isStockMode = mode === 'stock';
  const headerTitle = titleOverride || (isStockMode ? 'Check Pharmacy Stock' : 'Buy Medicine');
  const headerSubtitle = subtitleOverride || (isStockMode ? 'Find available stock from Verified Pharmacy Partners and continue to purchase securely' : 'Complete your purchase securely through a Verified Pharmacy Partner');
  const backButtonLabel = backLabel || (isStockMode ? 'Back to Medicine' : 'Back to Medicines');
  // Auth & EHR
  const { clinicalPrescriptions } = usePatientEhr();
  const { user } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState<PurchaseStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<PurchaseStep>>(new Set());

  // Medicine selection
  const [quantity, setQuantity] = useState(Math.max(1, initialQuantity));
  const [medicineError, setMedicineError] = useState<string | null>(null);

  // Prescription
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreviewUrl, setPrescriptionPreviewUrl] = useState<string | null>(null);
  const [prescriptionVerificationState, setPrescriptionVerificationState] = useState<PrescriptionVerificationState>('idle');
  const [selectedSavedPrescriptionId, setSelectedSavedPrescriptionId] = useState<string | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Pharmacy selection — live inventory sync
  const [livePharmacyOptions, setLivePharmacyOptions] = useState<PartnerAvailabilityOption[]>([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(true);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [pharmacyAsOf, setPharmacyAsOf] = useState<string | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PartnerAvailabilityOption | null>(null);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<'distance' | 'price_low' | 'price_high' | 'rating'>('distance');
  const [openFilter, setOpenFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'limited'>('all');
  const [selectingPharmacyId, setSelectingPharmacyId] = useState<string | null>(null);
  const [pharmacySelectError, setPharmacySelectError] = useState<string | null>(null);

  // Delivery address
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>(() => {
    try {
      const scope = user ? `user_${user.id}` : 'guest';
      const raw = localStorage.getItem(`globalhealth_${scope}_delivery_addresses`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'addr-home',
        label: 'Home',
        fullName: 'Md Rashid Hussain',
        mobile: '+91 98765 43210',
        house: 'Flat 402, Green Valley Apartments',
        street: 'Outer Ring Road, Marathahalli',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560103',
        landmark: 'Near Marathahalli Bridge',
        instructions: 'Call on arrival',
        isDefault: true,
      },
    ] as DeliveryAddress[];
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string>(savedAddresses[0]?.id || 'addr-home');
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<DeliveryAddress>>({
    label: 'Home',
    fullName: '',
    mobile: '',
    house: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    instructions: '',
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  // Delivery method
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('standard');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');

  // Coupon & pricing
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Order placement
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlacementError, setOrderPlacementError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<PharmacyOrder | null>(null);
  const [showTracking, setShowTracking] = useState(false);

  // Persist addresses
  useEffect(() => {
    try {
      const scope = user ? `user_${user.id}` : 'guest';
      localStorage.setItem(`globalhealth_${scope}_delivery_addresses`, JSON.stringify(savedAddresses));
    } catch {}
  }, [savedAddresses, user]);

  // Fetch live pharmacy availability — Section 9, 10, 30
  const fetchLiveAvailability = useCallback(async () => {
    setPharmacyLoading(true);
    setPharmacyError(null);
    setPharmacySelectError(null);
    const result = await fetchProductAvailability(product.id);
    if (!result.ok) {
      setLivePharmacyOptions([]);
      setPharmacyError(result.error || 'Availability temporarily unavailable. Please try again.');
    } else {
      setLivePharmacyOptions(result.options);
      setPharmacyAsOf(result.asOf || null);
      if (result.options.length === 0) {
        setPharmacyError(null);
      }
    }
    setPharmacyLoading(false);
  }, [product.id]);

  useEffect(() => {
    fetchLiveAvailability();
  }, [fetchLiveAvailability]);

  // Filtered pharmacies — Section 11
  const filteredPharmacies = useMemo(() => {
    let filtered = livePharmacyOptions.filter((p) => {
      const search = pharmacySearch.toLowerCase();
      const matchesSearch =
        !search ||
        p.partnerName.toLowerCase().includes(search) ||
        p.area.toLowerCase().includes(search) ||
        p.city.toLowerCase().includes(search) ||
        p.state.toLowerCase().includes(search);

      let matchesDistance = true;
      if (distanceFilter === '1') matchesDistance = p.distanceKm <= 1.5;
      else if (distanceFilter === '3') matchesDistance = p.distanceKm <= 3;
      else if (distanceFilter === '5') matchesDistance = p.distanceKm <= 5;
      else if (distanceFilter === '10') matchesDistance = p.distanceKm <= 10;

      let matchesOpen = true;
      if (openFilter === 'open') matchesOpen = p.isOpenNow;
      else if (openFilter === 'closed') matchesOpen = !p.isOpenNow;

      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = p.stockStatus === 'In Stock';
      else if (stockFilter === 'limited') matchesStock = p.stockStatus === 'Limited Stock';

      return matchesSearch && matchesDistance && matchesOpen && matchesStock;
    });

    // Sorting — price, distance, rating
    filtered = filtered.sort((a, b) => {
      if (priceSort === 'price_low') return a.price - b.price;
      if (priceSort === 'price_high') return b.price - a.price;
      if (priceSort === 'rating') return b.rating - a.rating;
      return a.distanceKm - b.distanceKm;
    });

    return filtered;
  }, [livePharmacyOptions, pharmacySearch, distanceFilter, openFilter, stockFilter, priceSort]);

  // Pricing calculations — Section 20, uses server recalculated totals but client preview
  const cartSubtotalMRP = useMemo(() => {
    const current = product.mrp * quantity;
    const existing = cartItems.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
    return current + existing;
  }, [product.mrp, quantity, cartItems]);

  const cartItemsSubtotal = useMemo(() => {
    const currentPrice = selectedPharmacy ? selectedPharmacy.price : product.price;
    const current = currentPrice * quantity;
    const existing = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    return current + existing;
  }, [product.price, quantity, cartItems, selectedPharmacy]);

  const totalDiscount = cartSubtotalMRP - cartItemsSubtotal;
  const deliveryFee = useMemo(() => {
    if (deliveryMethod === 'express') return 90;
    if (deliveryMethod === 'scheduled') return 60;
    return cartItemsSubtotal >= 500 ? 0 : 40;
  }, [deliveryMethod, cartItemsSubtotal]);
  const tax = cartItemsSubtotal * 0.05;
  const couponDiscount = couponApplied?.discount || 0;
  const grandTotal = Math.max(0, cartItemsSubtotal + deliveryFee + tax - couponDiscount);

  // Prescription handling — Section 7, 8, 31
  const isPrescriptionRequired = product.prescriptionRequired;

  const handlePrescriptionFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setPrescriptionError('Unsupported format. Please upload JPG, PNG, WEBP or PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPrescriptionError('File too large. Maximum 5 MB.');
      return;
    }
    setPrescriptionFile(file);
    setPrescriptionError(null);
    setPrescriptionVerificationState('pending');
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPrescriptionPreviewUrl(url);
    } else {
      setPrescriptionPreviewUrl(null);
    }
    // Simulate verification — in real system, pharmacy verification would happen server-side
    setTimeout(() => {
      // For demo, auto-verify if file exists
      setPrescriptionVerificationState('verified');
    }, 1500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePrescriptionFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePrescriptionFileSelect(file);
  };

  const clearPrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreviewUrl(null);
    setPrescriptionVerificationState('idle');
    setPrescriptionError(null);
    setSelectedSavedPrescriptionId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const allSavedPrescriptions = useMemo(() => {
    return [
      ...clinicalPrescriptions.map((rx) => ({
        id: rx.id,
        title: rx.title,
        doctorName: rx.doctorName,
        hospitalClinic: rx.hospitalClinic,
        prescriptionDate: rx.prescriptionDate,
        validUntil: rx.validUntil,
        status: rx.status,
        medications: rx.medications.map((m) => m.name).join(', '),
      })),
      ...uploadedPrescriptions.map((rx) => ({
        id: rx.id,
        title: rx.fileName,
        doctorName: rx.doctorName,
        hospitalClinic: 'Uploaded Record',
        prescriptionDate: rx.prescriptionDate,
        validUntil: 'Verified',
        status: rx.status,
        medications: 'Verified Schedule H Drugs',
      })),
    ];
  }, [clinicalPrescriptions, uploadedPrescriptions]);

  // Pharmacy selection with live validation — Section 12, 13, 30
  const handleSelectPharmacy = async (pharmacy: PartnerAvailabilityOption) => {
    setSelectingPharmacyId(pharmacy.partnerId);
    setPharmacySelectError(null);
    const validation = await validateInventoryItems([
      { productId: product.id, pharmacyId: pharmacy.partnerId, quantity },
    ]);
    setSelectingPharmacyId(null);
    if (!validation.ok) {
      setPharmacySelectError('Availability temporarily unavailable. Please try again.');
      fetchLiveAvailability();
      return;
    }
    const item = validation.results[0];
    if (!item?.eligible) {
      setPharmacySelectError(
        `This pharmacy no longer has sufficient stock. ${item.availableQuantity !== undefined ? `Only ${item.availableQuantity} left.` : 'Please select another.'}`
      );
      fetchLiveAvailability();
      return;
    }
    setSelectedPharmacy(pharmacy);
    setCompletedSteps((prev) => new Set([...prev, 1 as PurchaseStep, 2 as PurchaseStep, 3 as PurchaseStep]));
    setCurrentStep(4);
  };

  // Address handling — Section 15, 16
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];

  const validateAddress = (addr: Partial<DeliveryAddress>): string | null => {
    if (!addr.fullName?.trim()) return 'Full name is required.';
    if (!addr.mobile?.trim()) return 'Mobile number is required.';
    if (!addr.house?.trim()) return 'House/flat number is required.';
    if (!addr.street?.trim()) return 'Street/locality is required.';
    if (!addr.city?.trim()) return 'City is required.';
    if (!addr.state?.trim()) return 'State is required.';
    if (!addr.pincode?.trim()) return 'PIN code is required.';
    if (!/^\d{6}$/.test(addr.pincode.trim())) return 'PIN code must be 6 digits.';
    return null;
  };

  const handleAddNewAddress = () => {
    const error = validateAddress(newAddress);
    if (error) {
      setAddressError(error);
      return;
    }
    const addr: DeliveryAddress = {
      id: `addr-${Date.now()}`,
      label: newAddress.label || 'Home',
      fullName: newAddress.fullName!.trim(),
      mobile: newAddress.mobile!.trim(),
      house: newAddress.house!.trim(),
      street: newAddress.street!.trim(),
      city: newAddress.city!.trim(),
      state: newAddress.state!.trim(),
      pincode: newAddress.pincode!.trim(),
      landmark: newAddress.landmark?.trim(),
      instructions: newAddress.instructions?.trim(),
      isDefault: false,
    };
    setSavedAddresses((prev) => [...prev, addr]);
    setSelectedAddressId(addr.id);
    setShowAddAddressForm(false);
    setNewAddress({
      label: 'Home',
      fullName: '',
      mobile: '',
      house: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      instructions: '',
    });
    setAddressError(null);
  };

  const checkDeliveryAvailability = (): string | null => {
    if (!selectedPharmacy) return 'Please select a pharmacy first.';
    if (!selectedAddress) return 'Please select a delivery address.';
    if (!selectedPharmacy.deliveryAvailable) return 'This pharmacy does not currently deliver to this address.';
    // Simple distance check — if >10km and not express, warn
    if (selectedPharmacy.distanceKm > 10 && deliveryMethod === 'standard') {
      return 'This pharmacy does not currently deliver to this address for standard delivery. Try express or choose another pharmacy.';
    }
    return null;
  };

  // Coupon handling — Section 21
  const handleApplyCoupon = () => {
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    // Demo coupons
    if (code === 'HEALTH10') {
      const discount = Math.min(100, cartItemsSubtotal * 0.1);
      setCouponApplied({ code, discount, message: `Coupon Applied ✓ — You saved ₹${discount.toFixed(2)}` });
    } else if (code === 'WELCOME50') {
      const discount = Math.min(50, cartItemsSubtotal * 0.15);
      setCouponApplied({ code, discount, message: `Coupon Applied ✓ — You saved ₹${discount.toFixed(2)}` });
    } else if (code === 'FREESHIP') {
      const discount = deliveryFee;
      setCouponApplied({ code, discount, message: `Coupon Applied ✓ — Free delivery!` });
    } else {
      setCouponError('Invalid or expired coupon code.');
      setCouponApplied(null);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Place order — Section 24, 35
  const canPlaceOrder = useMemo(() => {
    if (!selectedPharmacy) return false;
    if (isPrescriptionRequired) {
      const hasValidPrescription = prescriptionVerificationState === 'verified' || !!selectedSavedPrescriptionId;
      if (!hasValidPrescription) return false;
    }
    if (!selectedAddress) return false;
    if (checkDeliveryAvailability()) return false;
    if (!paymentMethod) return false;
    if (paymentMethod === 'UPI' && !upiId.trim()) return false;
    if (paymentMethod === 'Credit / Debit Card' && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim())) return false;
    if (quantity < 1) return false;
    if (selectedPharmacy.stockCount < quantity) return false;
    return true;
  }, [
    selectedPharmacy,
    isPrescriptionRequired,
    prescriptionVerificationState,
    selectedSavedPrescriptionId,
    selectedAddress,
    paymentMethod,
    upiId,
    cardNumber,
    cardExpiry,
    cardCvv,
    quantity,
  ]);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      onRequireAuth('complete your medicine order');
      return;
    }
    if (!canPlaceOrder || !selectedPharmacy || !selectedAddress) {
      setOrderPlacementError('Please complete all required steps before placing order.');
      return;
    }

    setIsPlacingOrder(true);
    setOrderPlacementError(null);

    // Build order items: existing cart + current product
    const orderItems = [
      ...cartItems.map((item) => ({
        productId: item.product.id,
        pharmacyId: item.selectedPharmacyId,
        quantity: item.quantity,
      })),
      { productId: product.id, pharmacyId: selectedPharmacy.partnerId, quantity },
    ];

    const placement = await placeMarketplaceOrder(orderItems, deliveryFee);

    if (!placement.ok) {
      setOrderPlacementError(
        placement.error ||
          `Order failed${placement.medicineName ? `: ${placement.medicineName}` : ''}. ${placement.availableQuantity !== undefined ? `Only ${placement.availableQuantity} available.` : ''}`
      );
      setIsPlacingOrder(false);
      fetchLiveAvailability();
      return;
    }

    // Build PharmacyOrder for local history (mirrors server order)
    const now = new Date();
    const newOrder: PharmacyOrder = {
      id: placement.orderId,
      date: now.toISOString(),
      items: [
        ...cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          brandName: item.product.brandName,
          strength: item.product.strength,
          quantity: item.quantity,
          unitPrice: item.product.price,
          totalPrice: item.product.price * item.quantity,
          prescriptionRequired: item.product.prescriptionRequired,
        })),
        {
          productId: product.id,
          productName: product.name,
          brandName: product.brandName,
          strength: product.strength,
          quantity,
          unitPrice: selectedPharmacy.price,
          totalPrice: selectedPharmacy.price * quantity,
          prescriptionRequired: product.prescriptionRequired,
        },
      ],
      deliveryAddress: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.mobile,
        email: user?.email || 'user@example.com',
        street: `${selectedAddress.house}, ${selectedAddress.street}${selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ''}`,
        apartment: selectedAddress.landmark,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        deliveryType: deliveryMethod === 'express' ? 'express' : 'standard',
      },
      pricing: {
        subtotalMRP: cartSubtotalMRP,
        totalDiscount: totalDiscount + couponDiscount,
        itemsSubtotal: placement.pricing?.itemsSubtotal ?? cartItemsSubtotal,
        deliveryFee: placement.pricing?.deliveryFee ?? deliveryFee,
        tax: placement.pricing?.tax ?? tax,
        grandTotal: placement.pricing?.grandTotal ?? grandTotal,
      },
      prescriptionId: isPrescriptionRequired ? selectedSavedPrescriptionId || 'RX-UPLOADED-VERIFIED' : undefined,
      paymentMethod,
      paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending on Delivery' : 'Paid',
      status: isPrescriptionRequired ? 'Prescription Verified' : 'Order Placed',
      estimatedDelivery: deliveryMethod === 'express' ? 'Today in 30-45 minutes' : deliveryMethod === 'scheduled' ? `${scheduledDate} at ${scheduledTime}` : 'Tomorrow by 02:00 PM',
      trackingSteps: [
        {
          title: 'Order Confirmed',
          description: 'Order confirmed and routed to dispensary hub.',
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          completed: true,
        },
        {
          title: 'Prescription Checked',
          description: isPrescriptionRequired ? 'Doctor prescription validated by licensed pharmacist' : 'Inventory reserved under GPP standards',
          timestamp: 'Completed',
          completed: true,
        },
        {
          title: 'Pharmacy Preparing',
          description: `Being prepared at ${selectedPharmacy.partnerName}`,
          timestamp: 'In Progress',
          completed: true,
          current: true,
        },
        {
          title: 'Medicine Packed',
          description: 'Stored in tamper-proof packaging with verified invoice',
          timestamp: 'Pending',
          completed: false,
        },
        {
          title: 'Out for Delivery',
          description: 'Assigned to delivery partner with live GPS tracking',
          timestamp: 'Pending',
          completed: false,
        },
        {
          title: 'Delivered',
          description: 'Handover at doorstep with OTP verification',
          timestamp: 'Pending',
          completed: false,
        },
      ],
      fulfillingPharmacy: {
        name: selectedPharmacy.partnerName,
        license: selectedPharmacy.licenseNumber,
        phone: '+91 11 4982 3000',
      },
    };

    setTimeout(() => {
      setPlacedOrder(newOrder);
      onOrderPlaced(newOrder);
      setIsPlacingOrder(false);
    }, 800);
  };

  // Quantity handlers — Section 6
  const handleQuantityChange = (newQty: number) => {
    const maxQty = selectedPharmacy ? selectedPharmacy.stockCount : product.stockQuantity;
    if (newQty < 1) {
      setMedicineError('Minimum quantity is 1.');
      return;
    }
    if (newQty > maxQty) {
      setMedicineError(`Only ${maxQty} packs are currently available.`);
      return;
    }
    setMedicineError(null);
    setQuantity(newQty);
  };

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, placedOrder, showTracking]);

  // Order confirmation view — Section 25
  if (placedOrder && !showTracking) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" /> {backButtonLabel}
            </button>
            <div className="text-center">
              <h1 className="text-base font-bold text-slate-900">{headerTitle}</h1>
              <p className="text-[11px] text-slate-500">Order Confirmation</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <ShoppingCart className="h-4 w-4" /> Verified Cart (0)
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-10 space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Order Placed Successfully ✓</h2>
              <p className="text-sm text-slate-600">Your medicine package is being prepared at a verified pharmacy partner.</p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Order ID</span>
                  <span className="font-mono font-bold text-slate-900">{placedOrder.id}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Paid</span>
                  <span className="font-bold text-emerald-700 text-base">₹{placedOrder.pricing.grandTotal.toFixed(2)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Medicine</span>
                  <span className="font-bold text-slate-900">
                    {product.name} {product.strength} × {quantity}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Pharmacy</span>
                  <span className="font-semibold text-slate-800">{placedOrder.fulfillingPharmacy.name}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Delivery</span>
                  <span className="font-semibold text-slate-800">{placedOrder.estimatedDelivery}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setShowTracking(true)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Truck className="h-4 w-4" /> Track Order
              </button>
              <button
                onClick={() => onNavigateToOrders?.()}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-3 text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Package className="h-4 w-4" /> View Order
              </button>
              <button
                onClick={onBack}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" /> Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tracking workspace — Section 26
  if (placedOrder && showTracking) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => setShowTracking(false)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Confirmation
            </button>
            <h1 className="text-base font-bold text-slate-900">Track Order</h1>
            <span className="font-mono text-xs font-bold text-slate-600">{placedOrder.id}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Order Tracking Workspace</h2>
            <p className="text-sm text-slate-500 mb-6">
              {product.name} • {placedOrder.fulfillingPharmacy.name} • ₹{placedOrder.pricing.grandTotal.toFixed(2)}
            </p>

            <div className="relative pl-8 space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
              {placedOrder.trackingSteps.map((step, idx) => (
                <div key={idx} className="relative pb-8 last:pb-0 flex gap-4">
                  <div
                    className={`absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center border-2 z-10 ${
                      step.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : step.current
                        ? 'bg-amber-400 border-amber-400 text-white animate-pulse'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {step.completed ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div className="ml-10 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold ${step.completed || step.current ? 'text-slate-900' : 'text-slate-400'}`}>{step.title}</h4>
                      <span className="text-[11px] font-mono text-slate-400">{step.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    {idx < placedOrder.trackingSteps.length - 1 && <div className="mt-1 text-slate-300">↓</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-sm font-bold">
              Continue Shopping
            </button>
            <button onClick={() => onNavigateToOrders?.()} className="flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-3 text-sm font-bold text-slate-700">
              My Orders & Prescriptions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main workspace — Sections 2-24
  return (
    <div className="min-h-screen w-full bg-[#fcfcfd] flex flex-col">
      {/* Top Header — Section 3 */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> {backButtonLabel}
          </button>

          <div className="flex-1 text-center min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-slate-900 leading-none">{headerTitle}</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
              {headerSubtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 shrink-0">
            <ShoppingCart className="h-4 w-4" />
            <span>Verified Cart ({cartItems.length + 1})</span>
          </div>
        </div>
      </div>

      {/* Progress Bar — Section 4 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {[
              { id: 1 as PurchaseStep, label: 'Medicine', sub: 'Select Medicine' },
              { id: 2 as PurchaseStep, label: 'Prescription', sub: 'Prescription Verification' },
              { id: 3 as PurchaseStep, label: 'Pharmacy', sub: 'Select Pharmacy' },
              { id: 4 as PurchaseStep, label: 'Checkout', sub: 'Address, Delivery & Payment' },
            ].map((step, idx) => {
              const isCompleted = completedSteps.has(step.id) || currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isFuture = currentStep < step.id;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div
                      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-black border-2 shrink-0 transition ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-slate-900 border-slate-900 text-white ring-4 ring-slate-200'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                    </div>
                    <div className="min-w-0 hidden sm:block">
                      <div className={`text-[13px] font-bold leading-none ${isCurrent ? 'text-slate-900' : isCompleted ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {step.label}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{step.sub}</div>
                    </div>
                    <div className="sm:hidden min-w-0">
                      <div className={`text-xs font-bold truncate ${isCurrent ? 'text-slate-900' : isCompleted ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                  {idx < 3 && (
                    <div className={`h-0.5 flex-1 mx-1 sm:mx-2 transition ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Live pharmacy inventory • {pharmacyAsOf ? `checked ${new Date(pharmacyAsOf).toLocaleTimeString()}` : 'checking...'}</span>
            <button onClick={fetchLiveAvailability} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
              <RefreshCw className={`h-3 w-3 ${pharmacyLoading ? 'animate-spin' : ''}`} /> Re-check stock
            </button>
          </div>
        </div>
      </div>

      {/* Main Purchase Workspace — Section 2 */}
      <div className="flex-1 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-6 sm:gap-8 items-start">
        {/* LEFT / MAIN AREA */}
        <div className="space-y-6 min-w-0">
          {/* STEP 1 — MEDICINE SELECTION — Section 5 */}
          <section className={`rounded-3xl border bg-white shadow-sm overflow-hidden ${currentStep === 1 ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${currentStep === 1 ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}>
                  {completedSteps.has(1) ? <Check className="h-4 w-4" /> : 1}
                </span>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">Medicine Selection</h2>
                  <p className="text-[11px] text-slate-500">Selected medicine is already present — no need to search again</p>
                </div>
              </div>
              {currentStep !== 1 && (
                <button onClick={() => setCurrentStep(1)} className="text-xs font-bold text-emerald-700 hover:underline">
                  Edit
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Selected Medicine Card — Section 5, supports both Buy and Check Stock modes */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                <img src={product.imageUrl} alt={product.name} className="h-28 w-28 rounded-2xl object-cover border border-slate-200 bg-slate-50 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      {isStockMode && originMedicine && (
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <ShieldCheck className="h-3 w-3" /> Verified Clinical Monograph
                          </span>
                          <span className="rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[10px] font-bold">
                            {originMedicine.category || 'Neurology'}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${product.prescriptionRequired ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                            {product.prescriptionRequired ? 'Prescription Required (Rx)' : 'OTC Safe'}
                          </span>
                        </div>
                      )}
                      <h3 className="text-lg font-black text-slate-900">{product.name}</h3>
                      <p className="text-xs text-slate-600">
                        Active Molecule / Generic: <strong className="text-slate-900">{originMedicine?.genericName || product.genericName}</strong>
                      </p>
                      <p className="text-xs text-slate-600">
                        Therapeutic Class: <strong className="text-slate-800">{originMedicine?.therapeuticGroup || product.subCategory || product.category}</strong>
                      </p>
                      <p className="text-xs text-slate-500">Category: {originMedicine?.category || product.category}</p>
                      <p className="text-xs">
                        Classification:{' '}
                        <span className={`font-bold ${product.prescriptionRequired ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {product.prescriptionRequired ? `Prescription (Rx) — ${product.rxSchedule}` : 'OTC Safe'}
                        </span>
                      </p>
                      {isStockMode && originMedicine?.dosageForms && originMedicine.dosageForms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-500">Available Forms:</span>
                          {originMedicine.dosageForms.map((f: string, i: number) => (
                            <span key={i} className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{f}</span>
                          ))}
                        </div>
                      )}
                      {/* Stock Check Status — Section 6 */}
                      <div className="pt-2">
                        {pharmacyLoading ? (
                          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-800">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Checking current pharmacy stock...
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Stock information updated
                            </div>
                            {pharmacyAsOf && (
                              <div className="text-[11px] text-slate-500 font-mono">Last updated: {new Date(pharmacyAsOf).toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold border ${product.availability === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : product.availability === 'low_stock' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {product.availability === 'in_stock' ? '✓ In Stock' : product.availability === 'low_stock' ? 'Limited Stock' : 'Currently Unavailable'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Manufacturer</span>
                      <span className="font-semibold text-slate-800 truncate block">{product.manufacturer}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Strength</span>
                      <span className="font-semibold text-slate-800">{product.strength}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Form</span>
                      <span className="font-semibold text-slate-800">{product.dosageForm}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Pack Size</span>
                      <span className="font-semibold text-slate-800">{product.packSize}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Available Qty</span>
                      <span className="font-semibold text-slate-800">{selectedPharmacy ? selectedPharmacy.stockCount : product.stockQuantity} packs</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Price</span>
                      <span className="font-black text-slate-900">₹{(selectedPharmacy ? selectedPharmacy.price : product.price).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quantity Selector — Section 6 */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700">Quantity</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
                        <button
                          onClick={() => handleQuantityChange(quantity - 1)}
                          className="p-2.5 text-slate-600 hover:bg-slate-50 rounded-l-xl transition"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 text-sm font-black text-slate-900 min-w-10 text-center">{quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(quantity + 1)}
                          className="p-2.5 text-slate-600 hover:bg-slate-50 rounded-r-xl transition"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-slate-900">₹{((selectedPharmacy ? selectedPharmacy.price : product.price) * quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  {medicineError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> {medicineError}
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription Requirement — Section 7 */}
              <div className={`rounded-2xl border p-4 ${isPrescriptionRequired ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isPrescriptionRequired ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isPrescriptionRequired ? <FileText className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${isPrescriptionRequired ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {isPrescriptionRequired ? 'Prescription required for this medicine' : 'Prescription not required'}
                    </h4>
                    <p className={`text-xs mt-1 ${isPrescriptionRequired ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {isPrescriptionRequired
                        ? 'Upload a valid prescription to continue. A licensed pharmacist will verify it before fulfillment.'
                        : 'This is an OTC medicine. You can continue directly to pharmacy selection.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Availability — Section 9 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Availability</h4>
                {pharmacyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Checking stock...
                  </div>
                ) : livePharmacyOptions.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Available from {livePharmacyOptions.length} Verified Pharmacy Partners — ✓ In Stock
                  </div>
                ) : pharmacyError ? (
                  <div className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {pharmacyError}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-rose-700">Currently Unavailable from verified partners</div>
                )}
              </div>

              {currentStep === 1 && (
                <button
                  onClick={() => {
                    if (isPrescriptionRequired) {
                      setCurrentStep(2);
                      setCompletedSteps((s) => new Set([...s, 1]));
                    } else {
                      setCurrentStep(3);
                      setCompletedSteps((s) => new Set([...s, 1, 2]));
                    }
                  }}
                  disabled={pharmacyLoading || livePharmacyOptions.length === 0}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-3 text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  Continue to {isPrescriptionRequired ? 'Prescription' : 'Pharmacy'} <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              )}
            </div>
          </section>

          {/* STEP 2 — PRESCRIPTION VERIFICATION — Section 7,8 */}
          <section className={`rounded-3xl border bg-white shadow-sm overflow-hidden ${currentStep === 2 ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${currentStep === 2 ? 'bg-slate-900 text-white' : completedSteps.has(2) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {completedSteps.has(2) ? <Check className="h-4 w-4" /> : 2}
                </span>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">Prescription Verification</h2>
                  <p className="text-[11px] text-slate-500">Upload or select a valid prescription for Rx medicine</p>
                </div>
              </div>
              {currentStep !== 2 && completedSteps.has(2) && (
                <button onClick={() => setCurrentStep(2)} className="text-xs font-bold text-emerald-700 hover:underline">
                  Edit
                </button>
              )}
            </div>

            {currentStep === 2 && (
              <div className="p-5 sm:p-6 space-y-5">
                {!isPrescriptionRequired ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="h-5 w-5" /> Prescription not required for this medicine — you can continue directly.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Saved prescriptions */}
                    {allSavedPrescriptions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900">Choose from Saved Prescriptions</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {allSavedPrescriptions.map((rx) => (
                            <label
                              key={rx.id}
                              className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                                selectedSavedPrescriptionId === rx.id ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="saved-rx"
                                checked={selectedSavedPrescriptionId === rx.id}
                                onChange={() => {
                                  setSelectedSavedPrescriptionId(rx.id);
                                  setPrescriptionVerificationState('verified');
                                  setPrescriptionError(null);
                                }}
                                className="mt-1 text-emerald-600"
                              />
                              <div className="flex-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{rx.title}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{rx.status}</span>
                                </div>
                                <p className="text-slate-600 mt-0.5">Dr. {rx.doctorName} • {rx.hospitalClinic}</p>
                                <p className="text-[11px] text-slate-500">{rx.medications}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload area — Section 8 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900">Upload Prescription</h4>
                      <div
                        ref={dropRef}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition"
                      >
                        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileInputChange} className="hidden" />
                        {!prescriptionFile ? (
                          <>
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                              <Upload className="h-6 w-6 text-slate-500" />
                            </div>
                            <div className="text-sm font-bold text-slate-900">📄 Upload Prescription</div>
                            <p className="text-xs text-slate-500 mt-1">Drag & drop or select a file</p>
                            <p className="text-[11px] text-slate-400 mt-1">Supported: JPG, PNG, WEBP, PDF (max 5 MB)</p>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition"
                            >
                              Select File
                            </button>
                          </>
                        ) : (
                          <div className="text-left space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-900">{prescriptionFile.name}</div>
                                  <div className="text-xs text-slate-500">{(prescriptionFile.size / 1024).toFixed(1)} KB • {prescriptionFile.type}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {prescriptionVerificationState === 'pending' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                        <RefreshCw className="h-3 w-3 animate-spin" /> Pending Verification
                                      </span>
                                    )}
                                    {prescriptionVerificationState === 'verified' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="h-3 w-3" /> Prescription Verified
                                      </span>
                                    )}
                                    {prescriptionVerificationState === 'rejected' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                        <AlertTriangle className="h-3 w-3" /> Prescription Not Accepted
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button onClick={clearPrescription} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {prescriptionPreviewUrl && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                                <img src={prescriptionPreviewUrl} alt="Prescription preview" className="max-h-64 w-full object-contain" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                Replace
                              </button>
                              <button onClick={clearPrescription} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                                Remove
                              </button>
                              {prescriptionPreviewUrl && (
                                <button onClick={() => window.open(prescriptionPreviewUrl, '_blank')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" /> Preview
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {prescriptionError && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" /> {prescriptionError}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    if (isPrescriptionRequired && prescriptionVerificationState !== 'verified' && !selectedSavedPrescriptionId) {
                      setPrescriptionError('Please upload and verify a prescription or select a saved one before continuing.');
                      return;
                    }
                    setCompletedSteps((s) => new Set([...s, 2]));
                    setCurrentStep(3);
                  }}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  Continue to Pharmacy <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            )}

            {currentStep !== 2 && completedSteps.has(2) && (
              <div className="p-4 text-xs text-slate-600">
                {isPrescriptionRequired ? (
                  selectedSavedPrescriptionId ? (
                    <span className="flex items-center gap-2 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Saved prescription selected: {allSavedPrescriptions.find((r) => r.id === selectedSavedPrescriptionId)?.title}
                    </span>
                  ) : prescriptionFile ? (
                    <span className="flex items-center gap-2 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Prescription {prescriptionVerificationState === 'verified' ? 'Verified' : 'Uploaded'}: {prescriptionFile.name}
                    </span>
                  ) : null
                ) : (
                  <span className="flex items-center gap-2 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Prescription not required — verified
                  </span>
                )}
              </div>
            )}
          </section>

          {/* STEP 3 — PHARMACY SELECTION — Section 10-14 */}
          <section className={`rounded-3xl border bg-white shadow-sm overflow-hidden ${currentStep === 3 ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${currentStep === 3 ? 'bg-slate-900 text-white' : completedSteps.has(3) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {completedSteps.has(3) ? <Check className="h-4 w-4" /> : 3}
                </span>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">Choose Verified Pharmacy</h2>
                  <p className="text-[11px] text-slate-500">Only verified, active pharmacies with sufficient stock</p>
                </div>
              </div>
              {currentStep !== 3 && completedSteps.has(3) && (
                <button onClick={() => setCurrentStep(3)} className="text-xs font-bold text-emerald-700 hover:underline">
                  Change
                </button>
              )}
            </div>

            {currentStep === 3 && (
              <div className="p-5 sm:p-6 space-y-5">
                {/* Search — Section 11 */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      value={pharmacySearch}
                      onChange={(e) => setPharmacySearch(e.target.value)}
                      placeholder="🔍 Search pharmacy, area or PIN code"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select value={distanceFilter} onChange={(e) => setDistanceFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                      <option value="all">Any distance</option>
                      <option value="1">Within 1.5 km</option>
                      <option value="3">Within 3 km</option>
                      <option value="5">Within 5 km</option>
                      <option value="10">Within 10 km</option>
                    </select>
                    <select value={priceSort} onChange={(e) => setPriceSort(e.target.value as any)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                      <option value="distance">Sort by Distance</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="rating">Rating</option>
                    </select>
                    <select value={openFilter} onChange={(e) => setOpenFilter(e.target.value as any)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                      <option value="all">All Hours</option>
                      <option value="open">Open Now</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                      <option value="all">Any Stock</option>
                      <option value="in_stock">In Stock</option>
                      <option value="limited">Limited Stock</option>
                    </select>
                  </div>
                </div>

                {pharmacySelectError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {pharmacySelectError}
                  </div>
                )}

                {pharmacyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 p-4 animate-pulse">
                        <div className="h-4 w-1/3 bg-slate-200 rounded mb-2" />
                        <div className="h-3 w-2/3 bg-slate-100 rounded" />
                      </div>
                    ))}
                    <div className="text-center text-sm text-slate-500 py-4">Finding verified pharmacies...</div>
                  </div>
                ) : filteredPharmacies.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                    <Package className="h-8 w-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-bold text-slate-700">No verified pharmacies match your filters</div>
                    <p className="text-xs text-slate-500">Try expanding distance or resetting filters. Pharmacies with no stock never appear as available.</p>
                  </div>
                ) : (
                  <>
                    {/* Price comparison table — Section 13 */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Pharmacy Price Comparison</span>
                        <span className="text-[11px] text-slate-500">{filteredPharmacies.length} options</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                            <tr>
                              <th className="text-left px-4 py-2">Pharmacy</th>
                              <th className="text-right px-4 py-2">Price</th>
                              <th className="text-left px-4 py-2">Delivery</th>
                              <th className="text-left px-4 py-2">Stock</th>
                              <th className="text-right px-4 py-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredPharmacies.slice(0, 5).map((p) => (
                              <tr key={p.partnerId} className="hover:bg-slate-50/70">
                                <td className="px-4 py-2.5 font-semibold text-slate-900">{p.partnerName}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold">₹{p.price.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-slate-600">{p.estimatedFulfillment}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.stockStatus === 'In Stock' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {p.stockStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => handleSelectPharmacy(p)}
                                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-[11px] font-bold"
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pharmacy Cards — Section 12 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredPharmacies.map((pharmacy) => (
                        <div key={pharmacy.partnerId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900">{pharmacy.partnerName}</h4>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold border border-emerald-200">
                                  <ShieldCheck className="h-3 w-3" /> ✓ VERIFIED PHARMACY
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {pharmacy.rating.toFixed(1)}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {pharmacy.distanceKm} km away
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500">{pharmacy.area}</span>
                          </div>

                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">{product.name} {product.strength}</span>
                              <span className="font-black text-slate-900">₹{pharmacy.price.toFixed(2)} / pack</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span className={`font-bold ${pharmacy.stockStatus === 'In Stock' ? 'text-emerald-700' : 'text-amber-700'}`}>✓ {pharmacy.stockStatus}</span>
                              <span className="flex items-center gap-1 text-slate-600">
                                <Truck className="h-3 w-3" /> Delivery: {pharmacy.estimatedFulfillment}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock className="h-3 w-3" /> Open until {pharmacy.operatingHours}
                            </div>
                          </div>

                          <button
                            onClick={() => handleSelectPharmacy(pharmacy)}
                            disabled={selectingPharmacyId === pharmacy.partnerId}
                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 text-xs font-bold transition flex items-center justify-center gap-2"
                          >
                            {selectingPharmacyId === pharmacy.partnerId ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" /> Verifying stock...
                              </>
                            ) : (
                              <>Select Pharmacy</>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep !== 3 && selectedPharmacy && (
              <div className="p-5 space-y-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-emerald-900">✓ Pharmacy Selected</div>
                    <div className="mt-1 space-y-0.5 text-emerald-800">
                      <div><strong>{selectedPharmacy.partnerName}</strong> — Verified Pharmacy Partner</div>
                      <div>Address: {selectedPharmacy.area}, {selectedPharmacy.city}, {selectedPharmacy.state}</div>
                      <div>Distance: {selectedPharmacy.distanceKm} km • Rating: {selectedPharmacy.rating} • {selectedPharmacy.operatingHours}</div>
                      <div>Medicine Stock: {selectedPharmacy.stockCount} • Price: ₹{selectedPharmacy.price.toFixed(2)} • Delivery: {selectedPharmacy.estimatedFulfillment}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* STEP 4 — DELIVERY ADDRESS & CHECKOUT — Sections 15-24 */}
          <section className={`rounded-3xl border bg-white shadow-sm overflow-hidden ${currentStep === 4 ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${currentStep === 4 ? 'bg-slate-900 text-white' : completedSteps.has(4) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {completedSteps.has(4) ? <Check className="h-4 w-4" /> : 4}
                </span>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">Checkout — Address, Delivery & Payment</h2>
                  <p className="text-[11px] text-slate-500">Review, add address, choose delivery and pay securely</p>
                </div>
              </div>
            </div>

            {currentStep === 4 && (
              <div className="p-5 sm:p-6 space-y-6">
                {/* Delivery Address — Section 15 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Delivery Address
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`rounded-2xl border p-4 cursor-pointer transition text-left ${selectedAddressId === addr.id ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="delivery-address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 text-emerald-600"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{addr.label}</span>
                              {addr.isDefault && <span className="rounded-full bg-slate-900 text-white px-2 py-0.5 text-[9px] font-bold">Default</span>}
                            </div>
                            <div className="font-semibold text-slate-800 mt-1">{addr.fullName}</div>
                            <div className="text-slate-600">{addr.house}, {addr.street}</div>
                            <div className="text-slate-600">{addr.city}, {addr.state} — {addr.pincode}</div>
                            <div className="text-[11px] text-slate-500 mt-1">{addr.mobile}</div>
                            {addr.id === selectedAddressId && <div className="mt-2 text-[11px] font-bold text-emerald-700">[Selected]</div>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {!showAddAddressForm ? (
                    <button onClick={() => setShowAddAddressForm(true)} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Plus className="h-4 w-4" /> + Add New Address
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">Add New Address</h4>
                        <button onClick={() => setShowAddAddressForm(false)} className="p-1 rounded-full hover:bg-slate-100">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <input value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} placeholder="Label (Home/Work)" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} placeholder="Full name *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.mobile} onChange={(e) => setNewAddress({ ...newAddress, mobile: e.target.value })} placeholder="Mobile number *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.house} onChange={(e) => setNewAddress({ ...newAddress, house: e.target.value })} placeholder="House/flat number *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} placeholder="Street/locality *" className="rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" />
                        <input value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} placeholder="City *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} placeholder="State *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} placeholder="PIN code *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.landmark} onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })} placeholder="Landmark" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                        <input value={newAddress.instructions} onChange={(e) => setNewAddress({ ...newAddress, instructions: e.target.value })} placeholder="Delivery instructions" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                      </div>
                      {addressError && <div className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {addressError}</div>}
                      <button onClick={handleAddNewAddress} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold">
                        Save Address
                      </button>
                    </div>
                  )}

                  {checkDeliveryAvailability() && selectedPharmacy && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> {checkDeliveryAvailability()}
                    </div>
                  )}
                </div>

                {/* Delivery Method — Section 17 */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600" /> Delivery Method
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'standard' as DeliveryMethod, title: 'Standard Delivery', time: '30–60 minutes', fee: cartItemsSubtotal >= 500 ? 'FREE' : '₹40', desc: 'Regular delivery' },
                      { id: 'express' as DeliveryMethod, title: 'Express Delivery', time: '30–45 minutes', fee: '₹90', desc: 'Fastest delivery' },
                      { id: 'scheduled' as DeliveryMethod, title: 'Scheduled Delivery', time: 'Choose slot', fee: '₹60', desc: 'Pick date & time' },
                    ].map((method) => (
                      <label
                        key={method.id}
                        className={`rounded-2xl border p-4 cursor-pointer transition ${deliveryMethod === method.id ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input type="radio" name="delivery-method" checked={deliveryMethod === method.id} onChange={() => setDeliveryMethod(method.id)} className="mt-1 text-emerald-600" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{method.title}</span>
                              <span className="text-xs font-bold text-emerald-700">{method.fee}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">{method.time}</div>
                            <div className="text-[11px] text-slate-500">{method.desc}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {deliveryMethod === 'scheduled' && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                        <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Time Slot</label>
                        <select value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs">
                          <option value="09:00">09:00 AM - 11:00 AM</option>
                          <option value="11:00">11:00 AM - 01:00 PM</option>
                          <option value="14:00">02:00 PM - 04:00 PM</option>
                          <option value="16:00">04:00 PM - 06:00 PM</option>
                          <option value="18:00">06:00 PM - 08:00 PM</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Review — Section 19 */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-900">Order Review</h3>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Medicine</span>
                      <span className="font-bold text-slate-900">{product.name} {product.strength} × {quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pharmacy</span>
                      <span className="font-semibold text-slate-800">{selectedPharmacy?.partnerName || 'Not selected'} {selectedPharmacy ? '— Verified' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prescription</span>
                      <span className="font-semibold text-emerald-700">
                        {isPrescriptionRequired ? (prescriptionVerificationState === 'verified' || selectedSavedPrescriptionId ? '✓ Verified Prescription' : 'Pending') : '✓ Not Required'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery Address</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]">{selectedAddress ? `${selectedAddress.house}, ${selectedAddress.city}` : 'Not selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery Method</span>
                      <span className="font-semibold text-slate-800">{deliveryMethod === 'express' ? 'Express Delivery' : deliveryMethod === 'scheduled' ? `Scheduled (${scheduledDate} ${scheduledTime})` : 'Standard Delivery'}</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown — Section 20 */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" /> Complete Price Breakdown
                  </h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Medicine subtotal</span>
                      <span className="font-mono">₹{cartItemsSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery fee</span>
                      <span className="font-mono">₹{deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes (GST 5%)</span>
                      <span className="font-mono">₹{tax.toFixed(2)}</span>
                    </div>
                    {couponApplied && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Discount ({couponApplied.code})</span>
                        <span className="font-mono">-₹{couponApplied.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Discount (MRP savings)</span>
                      <span className="font-mono text-emerald-700">-₹{totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                      <span>Total Payable</span>
                      <span className="font-mono text-base">₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">Product price × quantity + applicable charges − valid discounts = final payable amount</p>
                  </div>
                </div>

                {/* Discount / Coupon — Section 21 */}
                <div className="space-y-2 border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Coupon / Discount Code
                  </h4>
                  {!couponApplied ? (
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter Code"
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                      />
                      <button onClick={handleApplyCoupon} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition">
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">{couponApplied.message}</span>
                      <button onClick={handleRemoveCoupon} className="text-xs font-bold text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  )}
                  {couponError && <div className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {couponError}</div>}
                  <div className="text-[11px] text-slate-400">Try: HEALTH10, WELCOME50, FREESHIP</div>
                </div>

                {/* Payment Method — Section 22 */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" /> Payment Method
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'UPI' as PaymentMethod, label: 'UPI Payment', desc: 'GPay, PhonePe, Paytm, BHIM', icon: '⚡' },
                      { id: 'Credit / Debit Card' as PaymentMethod, label: 'Debit/Credit Card', desc: 'Visa, Mastercard, Rupay', icon: '💳' },
                      { id: 'Net Banking' as PaymentMethod, label: 'Net Banking', desc: 'All major banks', icon: '🏛️' },
                      { id: 'Cash on Delivery' as PaymentMethod, label: 'Cash on Delivery', desc: 'Pay at doorstep', icon: '💵' },
                    ].map((method) => (
                      <label
                        key={method.id}
                        className={`rounded-2xl border p-4 cursor-pointer transition ${paymentMethod === method.id ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <input type="radio" name="payment" checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="mt-1 text-emerald-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{method.icon}</span>
                              <span className="text-xs font-bold text-slate-900">{method.label}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{method.desc}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">UPI ID</label>
                      <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okhdfcbank" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none" />
                    </div>
                  )}

                  {paymentMethod === 'Credit / Debit Card' && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Card Number</label>
                        <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Expiry</label>
                        <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">CVV</label>
                        <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="123" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" />
                      </div>
                    </div>
                  )}

                  {/* Payment Security — Section 23 */}
                  <div className="rounded-xl bg-slate-900 text-white p-3 flex items-start gap-2.5 text-xs">
                    <Lock className="h-4 w-4 text-emerald-400 mt-0.5" />
                    <div>
                      <div className="font-bold">🔒 Secure Payment</div>
                      <div className="text-slate-300 text-[11px] mt-0.5">Your payment information is securely processed. We do not store sensitive payment information unnecessarily.</div>
                    </div>
                  </div>
                </div>

                {/* Error states — Section 32 */}
                {orderPlacementError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-xs text-rose-800">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-bold">Order could not be placed</div>
                      <div className="mt-1">{orderPlacementError}</div>
                      <div className="mt-2 text-[11px] text-rose-600">
                        {orderPlacementError.includes('stock') && 'This medicine is currently unavailable from the selected pharmacy.'}
                        {orderPlacementError.includes('prescription') && 'The prescription could not be verified. Please upload a valid prescription.'}
                        {orderPlacementError.includes('pharmacy') && 'This pharmacy is currently unavailable. Please select another Verified Pharmacy Partner.'}
                        {orderPlacementError.includes('deliver') && 'This pharmacy cannot deliver to the selected address.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Place Order Area — Section 24 */}
                <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Payable</div>
                    <div className="text-2xl font-black">₹{grandTotal.toFixed(2)}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {quantity} pack × ₹{(selectedPharmacy ? selectedPharmacy.price : product.price).toFixed(2)} + fees - discounts
                    </div>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!canPlaceOrder || isPlacingOrder}
                    className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isPlacingOrder ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Processing payment...
                      </>
                    ) : (
                      <>✓ Place Order — ₹{grandTotal.toFixed(2)}</>
                    )}
                  </button>
                </div>

                {!canPlaceOrder && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
                    <div className="font-bold flex items-center gap-1.5">
                      <Info className="h-4 w-4" /> Complete all mandatory conditions to place order:
                    </div>
                    <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
                      {!selectedPharmacy && <li>Select a verified pharmacy</li>}
                      {isPrescriptionRequired && prescriptionVerificationState !== 'verified' && !selectedSavedPrescriptionId && <li>Complete prescription verification</li>}
                      {!selectedAddress && <li>Select a valid delivery address</li>}
                      {checkDeliveryAvailability() && <li>Fix delivery availability</li>}
                      {paymentMethod === 'UPI' && !upiId.trim() && <li>Enter UPI ID</li>}
                      {selectedPharmacy && selectedPharmacy.stockCount < quantity && <li>Reduce quantity — insufficient stock</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT / ORDER SUMMARY — Section 2 */}
        <div className="lg:sticky lg:top-[132px] space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" /> Order Summary
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-bold">{cartItems.length + 1} items</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Current medicine */}
              <div className="flex gap-3">
                <img src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover border border-slate-200 bg-slate-50" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{product.name}</div>
                  <div className="text-[11px] text-slate-500">{product.strength} • {product.dosageForm}</div>
                  <div className="text-[11px] text-slate-500">{product.packSize}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900">Qty: {quantity}</span>
                    <span className="text-xs font-black text-slate-900">₹{((selectedPharmacy ? selectedPharmacy.price : product.price) * quantity).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pharmacy: {selectedPharmacy?.partnerName || 'Not selected'} • {selectedPharmacy ? (selectedPharmacy.stockStatus === 'In Stock' ? '✓ In Stock' : selectedPharmacy.stockStatus) : 'Select pharmacy'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Prescription: {isPrescriptionRequired ? (prescriptionVerificationState === 'verified' || selectedSavedPrescriptionId ? '✓ Verified' : 'Required') : '✓ Not Required'}
                  </div>
                </div>
              </div>

              {/* Existing cart items — Section 29 */}
              {cartItems.length > 0 && (
                <>
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Cart ({cartItems.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="flex gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                          <img src={item.product.imageUrl} alt={item.product.name} className="h-10 w-10 rounded-lg object-cover border border-slate-200 bg-white" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{item.product.name}</div>
                            <div className="text-[10px] text-slate-500">{item.product.strength} • {item.product.dosageForm} • Qty {item.quantity}</div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[11px] font-bold">₹{(item.product.price * item.quantity).toFixed(2)}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => onUpdateCartQuantity(item.product.id, item.quantity - 1)} className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-[11px] font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => onUpdateCartQuantity(item.product.id, item.quantity + 1)} className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button onClick={() => onRemoveCartItem(item.product.id)} className="h-6 w-6 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-100 ml-1">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Medicine subtotal</span>
                  <span className="font-mono">₹{cartItemsSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span className="font-mono">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes</span>
                  <span className="font-mono">₹{tax.toFixed(2)}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount ({couponApplied.code})</span>
                    <span className="font-mono">-₹{couponApplied.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Final Total</span>
                  <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 text-white p-3 flex items-center gap-2 text-[11px]">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Secure purchase through Verified Pharmacy Partner • 100% genuine medicines</span>
              </div>

              {/* Loading states — Section 33 */}
              {pharmacyLoading && <div className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking stock...</div>}
              {isPlacingOrder && <div className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing payment...</div>}
            </div>
          </div>

          {/* Trust & design goal — Section 36 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Award className="h-4 w-4 text-emerald-600" /> Minimal + professional + trustworthy
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              White/light background, dark navy text, GlobalHealth green for primary actions, soft borders, rounded cards, clear status badges, strong contrast, large readable typography, generous spacing.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Lock className="h-3 w-3" /> Secure Payment • Your payment information is securely processed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
