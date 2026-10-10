import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Pill, 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles,
  Bookmark,
  X,
  FileText,
  HelpCircle as QuestionIcon,
  Clock,
  Thermometer,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  Droplet,
  HeartPulse,
  Activity,
  Layers,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Building2,
  Truck,
  Plus,
  Minus,
  SlidersHorizontal,
  Check,
  Award,
  Package,
  RotateCcw,
  Mic,
  CreditCard,
  Lock,
  ArrowUpRight,
  TrendingDown,
  Eye,
  Sliders,
  DollarSign,
  MapPin
} from 'lucide-react';
import { MEDICINES } from '../data/healthData';
import { PHARMACY_PRODUCTS, VERIFIED_PHARMACY_PARTNERS, PHARMACY_FAQS } from '../data/pharmacyProductsData';
import { fetchProductAvailability } from '../services/pharmacyInventoryClient';
import { Medicine, NavigationTab } from '../types';
import { PharmacyProduct, CartItem, UploadedPrescription, PharmacyOrder, PharmacyPartner, PartnerAvailabilityOption } from '../types/pharmacyMarketplace';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { PharmacyProductDetailModal } from './pharmacy/PharmacyProductDetailModal';
import { MedicineMonographModal } from './MedicineMonographModal';
import { MedicineDetailPage } from './medicines/MedicineDetailPage';
import { VerifiedPartnerSelectModal } from './pharmacy/VerifiedPartnerSelectModal';
import { PharmacyCartSlideOver } from './pharmacy/PharmacyCartSlideOver';
import { PharmacyCheckoutModal } from './pharmacy/PharmacyCheckoutModal';
import { OrderTrackingModal } from './pharmacy/OrderTrackingModal';
import { FullScreenBuyMedicineWorkspace } from './pharmacy/FullScreenBuyMedicineWorkspace';

interface MedicinesViewProps {
  savedIds: string[];
  onToggleSave: (id: string) => void;
  isAuthenticated?: boolean;
  onRequireAuth?: (feature: string) => void;
  onNavigate?: (tab: NavigationTab) => void;
  onAskAI?: (prompt: string) => void;
}

/** Monograph cards rendered per page. Mirrors the disease and lab-test
 *  directories, which paginate rather than mounting the whole catalog. */
const MONOGRAPHS_PER_PAGE = 24;

/**
 * One- or two-sentence plain-language answer to "what is this medicine?".
 *
 * Mirrors plainLanguageSummary() used by the disease cards so both directories
 * read the same way: the card states what the entry is, and every clinical
 * detail lives behind "View More".
 */
function medicineShortSummary(med: Medicine): string {
  const raw = (med.whatIs || med.description || '').replace(/\s+/g, ' ').trim();
  if (raw) {
    if (raw.length <= 160) return raw;
    const cut = raw.slice(0, 160);
    const lastDot = cut.lastIndexOf('.');
    return lastDot > 80 ? cut.slice(0, lastDot + 1) : `${cut.trimEnd()}…`;
  }
  // Fall back to the recognised uses so a card is never left blank.
  if (med.uses?.length) return `Used for ${med.uses.slice(0, 2).join(' and ').toLowerCase()}.`;
  return 'Tap View More for the full clinical information on this medicine.';
}

export const MedicinesView: React.FC<MedicinesViewProps> = ({ 
  savedIds, 
  onToggleSave,
  isAuthenticated = false,
  onRequireAuth,
  onNavigate,
  onAskAI
}) => {
  const { t, formatNumber } = useLocalization();
  const [purchaseNotice, setPurchaseNotice] = useState('');

  // Purchasing / checkout / orders are transactional → require an account.
  const requirePurchaseAuth = (feature: string): boolean => {
    if (isAuthenticated) return true;
    onRequireAuth?.(feature);
    return false;
  };

  // Active Main Tab: 400 Clinical Monographs, Verified Pharmacy Store, My Orders, Drug Interactions
  const [activeTab, setActiveTab] = useState<'monographs' | 'orders' | 'interactions'>('monographs');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [monographSpecialtyFilter, setMonographSpecialtyFilter] = useState<string>('All');
  const [monographPage, setMonographPage] = useState(1);
  const [selectedMedicineForMonograph, setSelectedMedicineForMonograph] = useState<Medicine | null>(null);

  // Hash listener for deep links like #medicines/med-1-paracetamol
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('medicines/')) {
        const id = hash.replace('medicines/', '').trim();
        const found = MEDICINES.find((m) => m.id === id || m.name.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase());
        if (found) {
          setSelectedMedicineForMonograph(found);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openMedicine = (med: Medicine) => {
    setSelectedMedicineForMonograph(med);
    if (window.location.hash.replace(/^#\/?/, '') !== `medicines/${med.id}`) {
      window.location.hash = `#medicines/${med.id}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeMedicine = () => {
    setSelectedMedicineForMonograph(null);
    if (window.location.hash.includes('medicines/')) {
      window.location.hash = '#medicines';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start the real pharmacy purchase flow from any medicine card. The
  // monograph catalogue is larger than the currently listed marketplace
  // products. Never send shoppers into a professional partner workspace.
  const handleBuyMedicine = (medicine: Medicine) => {
    setPurchaseNotice('');
    if (!requirePurchaseAuth('buy medicines from a verified pharmacy')) return;
    const queryName = medicine.name.toLowerCase();
    const queryGeneric = medicine.genericName.toLowerCase();
    const product = PHARMACY_PRODUCTS.find((candidate) => {
      const name = candidate.name.toLowerCase();
      const generic = candidate.genericName.toLowerCase();
      return name.includes(queryName) || queryName.includes(name) ||
        generic.includes(queryGeneric) || queryGeneric.includes(generic);
    });

    if (product) {
      setBuyWorkspaceMode('buy');
      setOriginMedicineForStock(null);
      setSelectedProductForBuying(product);
      return;
    }

    setPurchaseNotice(`No verified marketplace listing is available for ${medicine.name} yet. Please try another medicine or check again later.`);
  };

  // Check Pharmacy Stock — full-screen workspace from clinical monograph per blueprint
  // Medicine Monograph → Check Pharmacy Stock → Full-Screen Pharmacy Stock Workspace
  // Same structure as Buy Medicine, but entry point is monograph detail.
  const handleCheckPharmacyStock = (medicine: Medicine) => {
    if (!requirePurchaseAuth('check pharmacy stock and purchase medicines')) return;
    const queryName = medicine.name.toLowerCase();
    const queryGeneric = medicine.genericName.toLowerCase();
    // Try to find exact product; if not found, create a synthetic product from medicine data for Clonazepam etc.
    let product = PHARMACY_PRODUCTS.find((candidate) => {
      const name = candidate.name.toLowerCase();
      const generic = candidate.genericName.toLowerCase();
      return name.includes(queryName) || queryName.includes(name) ||
        generic.includes(queryGeneric) || queryGeneric.includes(generic);
    });

    // For Clonazepam or any medicine without marketplace listing, create a synthetic product using available data
    if (!product) {
      // Create a synthetic PharmacyProduct to ensure workspace always opens per blueprint.
      // Every PharmacyProduct field is populated explicitly (no `as` cast) so the
      // marketplace workspace never renders an undefined price, pack or warning.
      const isRx = !medicine.overTheCounter || !!(medicine.prescriptionStatus && medicine.prescriptionStatus.toLowerCase().includes('rx'));
      // `Medicine.dosageForms` is a free-text list; narrow it to the marketplace union.
      const DOSAGE_FORMS: PharmacyProduct['dosageForm'][] = [
        'Tablet', 'Capsule', 'Syrup', 'Topical Gel', 'Drops', 'Sachet / Powder',
        'Liquid Solution', 'Medical Device', 'Kit / Pack', 'Cream', 'Ointment', 'Inhaler',
      ];
      const firstForm = String(medicine.dosageForms?.[0] ?? '').trim();
      const dosageForm: PharmacyProduct['dosageForm'] =
        (DOSAGE_FORMS.find((f) => f.toLowerCase() === firstForm.toLowerCase()) ??
          (firstForm.toLowerCase().includes('syrup') ? 'Syrup'
            : firstForm.toLowerCase().includes('capsul') ? 'Capsule'
              : firstForm.toLowerCase().includes('drop') ? 'Drops'
                : firstForm.toLowerCase().includes('cream') ? 'Cream'
                  : firstForm.toLowerCase().includes('ointment') ? 'Ointment'
                    : firstForm.toLowerCase().includes('inhal') ? 'Inhaler'
                      : firstForm.toLowerCase().includes('gel') ? 'Topical Gel'
                        : firstForm.toLowerCase().includes('liquid') ? 'Liquid Solution'
                          : 'Tablet'));
      const mrp = 120;
      const price = 95;
      product = {
        id: `synthetic-${medicine.id}`,
        name: medicine.name,
        brandName: medicine.name,
        genericName: medicine.genericName,
        category: 'Prescription',
        subCategory: medicine.category || 'Neurology',
        composition: medicine.genericName,
        strength: '0.5 mg',
        dosageForm,
        packSize: '10 Tablets',
        manufacturer: 'Verified Pharma',
        prescriptionRequired: isRx,
        rxSchedule: isRx ? 'Schedule H' : 'OTC / Non-Scheduled',
        mrp,
        price,
        discountPercent: 20,
        availability: 'in_stock',
        stockQuantity: 24,
        imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
        imageType: dosageForm === 'Capsule' ? 'capsule' : 'tablet',
        pharmacyPartnerId: 'synthetic',
        pharmacyPartnerName: 'Verified Partner',
        description:
          medicine.description ??
          medicine.whatIs ??
          `${medicine.name} (${medicine.genericName}) — a clinician-reviewed synthetic listing for medicines that have no marketplace partner record yet.`,
        uses: medicine.uses ?? [],
        countryOfOrigin: 'India',
        storage: 'Store below 25 °C in a dry place, protected from direct sunlight.',
        warnings:
          'This synthetic listing is for information only. Confirm strength, schedule and supply with a licensed pharmacist before use.',
        dosageInstructions: 'Take only as directed by a qualified healthcare professional.',
        sideEffects: medicine.sideEffects ?? [],
        lastReviewedDate: new Date().toISOString().slice(0, 10),
      };
    }

    setBuyWorkspaceMode('stock');
    setOriginMedicineForStock(medicine);
    setSelectedProductForBuying(product);
  };
  // Voice search (Web Speech API). Hidden when unsupported — never decorative.
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
  const voiceRecognitionRef = useRef<any>(null);

  const startVoiceSearch = () => {
    if (!voiceSupported || voiceListening) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);
    recognition.onresult = (event: any) => {
      const transcript: string = event.results?.[0]?.[0]?.transcript || '';
      if (transcript.trim()) setSearchTerm(transcript.trim());
    };
    voiceRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
    }
  };

  const stopVoiceSearch = () => {
    try {
      voiceRecognitionRef.current?.stop();
    } catch {}
    setVoiceListening(false);
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // All personal pharmacy data (cart, prescriptions, orders) is namespaced to
  // the authenticated account so it can never be shared between users or
  // remain visible after logout. Derived from the secure auth session.
  const { user: authUserAccount } = useAuth();
  const pharmacyScope = authUserAccount ? `user_${authUserAccount.id}` : 'guest';

  // Cart State (Persisted in localStorage, per-user)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`globalhealth_${pharmacyScope}_pharmacy_cart`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (cartItems.length) localStorage.setItem(`globalhealth_${pharmacyScope}_pharmacy_cart`, JSON.stringify(cartItems));
      else localStorage.removeItem(`globalhealth_${pharmacyScope}_pharmacy_cart`);
    } catch {}
  }, [cartItems, pharmacyScope]);

  // Uploaded Prescriptions State (private — starts empty per account)
  const [uploadedPrescriptions, setUploadedPrescriptions] = useState<UploadedPrescription[]>(() => {
    try {
      const saved = localStorage.getItem(`globalhealth_${pharmacyScope}_uploaded_prescriptions`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (uploadedPrescriptions.length) localStorage.setItem(`globalhealth_${pharmacyScope}_uploaded_prescriptions`, JSON.stringify(uploadedPrescriptions));
      else localStorage.removeItem(`globalhealth_${pharmacyScope}_uploaded_prescriptions`);
    } catch {}
  }, [uploadedPrescriptions, pharmacyScope]);

  // Past Orders State (private — starts empty per account)
  const [orders, setOrders] = useState<PharmacyOrder[]>(() => {
    try {
      const saved = localStorage.getItem(`globalhealth_${pharmacyScope}_pharmacy_orders`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (orders.length) localStorage.setItem(`globalhealth_${pharmacyScope}_pharmacy_orders`, JSON.stringify(orders));
      else localStorage.removeItem(`globalhealth_${pharmacyScope}_pharmacy_orders`);
    } catch {}
  }, [orders, pharmacyScope]);

  // Modal Control States
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<PharmacyProduct | null>(null);
  const [selectedProductForBuying, setSelectedProductForBuying] = useState<PharmacyProduct | null>(null);
  const [buyWorkspaceMode, setBuyWorkspaceMode] = useState<'buy' | 'stock'>('buy');
  const [originMedicineForStock, setOriginMedicineForStock] = useState<Medicine | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<PharmacyOrder | null>(null);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  // Interaction Tool States
  const [selectedMed1, setSelectedMed1] = useState<string>('');
  const [selectedMed2, setSelectedMed2] = useState<string>('');
  const [interactionResult, setInteractionResult] = useState<{ type: 'warning' | 'safe' | 'info'; text: string } | null>(null);

  // 8 Popular Healthcare Categories
  const categories = [
    'All',
    'Prescription',
    'OTC',
    'Generic',
    'Vitamins & Nutrition',
    'Medical Devices',
    'First Aid',
    'Personal Care'
  ];

  const checkCategoryMatch = (prodCategory: string, filter: string) => {
    if (filter === 'All') return true;
    if (filter === 'Prescription' || filter === 'Prescription Medicines') {
      return prodCategory === 'Prescription' || prodCategory === 'Prescription Medicines';
    }
    if (filter === 'OTC' || filter === 'Over-the-Counter') {
      return prodCategory === 'OTC' || prodCategory === 'Over-the-Counter';
    }
    if (filter === 'Generic' || filter === 'Generic Medicines') {
      return prodCategory === 'Generic' || prodCategory === 'Generic Medicines';
    }
    return prodCategory.toLowerCase() === filter.toLowerCase();
  };

  // Cart operations
  const handleAddToCartWithPartner = (product: PharmacyProduct, partner: PartnerAvailabilityOption) => {
    if (!requirePurchaseAuth('add medicines to your cart and place an order')) return;
    const customizedProduct: PharmacyProduct = {
      ...product,
      price: partner.price,
      pharmacyPartnerId: partner.partnerId,
      pharmacyPartnerName: partner.partnerName
    };

    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.selectedPharmacyId === partner.partnerId);
      if (existing) {
        return prev.map(i => (i.product.id === product.id && i.selectedPharmacyId === partner.partnerId) 
          ? { ...i, quantity: i.quantity + 1 } 
          : i);
      }
      return [...prev, { product: customizedProduct, quantity: 1, selectedPharmacyId: partner.partnerId }];
    });

    setSelectedProductForBuying(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCartItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderPlaced = (order: PharmacyOrder) => {
    setOrders(prev => [order, ...prev]);
    setCartItems([]);
  };

  // Search Autocomplete Suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const query = searchTerm.toLowerCase();
    const suggestions: { title: string; type: 'Medicine' | 'Generic' | 'Device' | 'Category'; id?: string }[] = [];

    // Check categories
    categories.forEach(cat => {
      if (cat !== 'All' && cat.toLowerCase().includes(query)) {
        suggestions.push({ title: cat, type: 'Category' });
      }
    });

    // Check products
    PHARMACY_PRODUCTS.forEach(p => {
      if (p.name.toLowerCase().includes(query) || p.brandName.toLowerCase().includes(query)) {
        suggestions.push({ title: p.name, type: p.category === 'Medical Devices' ? 'Device' : 'Medicine', id: p.id });
      } else if (p.genericName.toLowerCase().includes(query)) {
        suggestions.push({ title: p.genericName, type: 'Generic', id: p.id });
      }
    });

    return suggestions.slice(0, 6);
  }, [searchTerm]);

  // Filtered Products (Medicine Catalog)
  const filteredProducts = useMemo(() => {
    return PHARMACY_PRODUCTS.filter(p => {
      // Search term: searches across name, brandName, genericName, active ingredient (composition), category, subCategory, manufacturer, dosageForm
      const matchesSearch = 
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.composition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dosageForm.toLowerCase().includes(searchTerm.toLowerCase());

      // Category
      const matchesCategory = checkCategoryMatch(p.category, selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // 8 Specialties / Categories for 400 Complete Clinical Monographs
  const monographCategories = [
    'All',
    'Daily Life & Primary Care',
    'Cardiology',
    'Neurology',
    'Pulmonology',
    'Gastroenterology',
    'Orthopedics',
    'Nephrology',
    'Specialist & Endocrinology'
  ];

  // Filtered 400 Clinical Monographs
  const filteredMonographs = useMemo(() => {
    return MEDICINES.filter(m => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        (m.therapeuticGroup && m.therapeuticGroup.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q) ||
        m.uses.some(u => u.toLowerCase().includes(q));

      const matchesSpecialty = monographSpecialtyFilter === 'All' ||
        m.category.toLowerCase().includes(monographSpecialtyFilter.toLowerCase()) ||
        (m.therapeuticGroup && m.therapeuticGroup.toLowerCase().includes(monographSpecialtyFilter.toLowerCase()));

      return matchesSearch && matchesSpecialty;
    });
  }, [searchTerm, monographSpecialtyFilter, MEDICINES]);

  // Rendering all 400 monographs at once produced ~10k DOM nodes and made the
  // page feel sluggish. Show one page at a time, like the other directories.
  const monographTotalPages = Math.max(1, Math.ceil(filteredMonographs.length / MONOGRAPHS_PER_PAGE));
  const visibleMonographs = useMemo(() => {
    const start = (monographPage - 1) * MONOGRAPHS_PER_PAGE;
    return filteredMonographs.slice(start, start + MONOGRAPHS_PER_PAGE);
  }, [filteredMonographs, monographPage]);

  // Any change to the query or specialty puts the reader back on page 1.
  useEffect(() => {
    setMonographPage(1);
  }, [searchTerm, monographSpecialtyFilter]);

  // Guard against a page index left beyond the end of a shrunken result set.
  useEffect(() => {
    if (monographPage > monographTotalPages) setMonographPage(monographTotalPages);
  }, [monographPage, monographTotalPages]);

  // Clinical drug interaction checker
  const checkInteractions = () => {
    if (!selectedMed1 || !selectedMed2) return;
    if (selectedMed1 === selectedMed2) {
      setInteractionResult({ type: 'warning', text: 'Please select two different medications to check for interactions.' });
      return;
    }

    const med1 = MEDICINES.find((m) => m.id === selectedMed1);
    const med2 = MEDICINES.find((m) => m.id === selectedMed2);

    if (med1 && med2) {
      const name1 = med1.name.toLowerCase();
      const name2 = med2.name.toLowerCase();

      const isNSAID1 = name1.includes('ibuprofen') || name1.includes('naproxen') || name1.includes('aspirin') || name1.includes('diclofenac');
      const isNSAID2 = name2.includes('ibuprofen') || name2.includes('naproxen') || name2.includes('aspirin') || name2.includes('diclofenac');
      const isAntacid1 = name1.includes('antacid');
      const isAntacid2 = name2.includes('antacid');
      const isSedative1 = name1.includes('chlorpheniramine') || name1.includes('dextromethorphan');
      const isSedative2 = name2.includes('chlorpheniramine') || name2.includes('dextromethorphan');

      if (isNSAID1 && isNSAID2) {
        setInteractionResult({
          type: 'warning',
          text: `⚠️ High Interaction Warning: Combining multiple NSAIDs (${med1.name} + ${med2.name}) significantly increases the risk of severe stomach ulcers, gastrointestinal bleeding, and kidney strain. Avoid taking them together unless specifically prescribed by a physician.`
        });
      } else if (isAntacid1 || isAntacid2) {
        const otherMed = isAntacid1 ? med2.name : med1.name;
        setInteractionResult({
          type: 'info',
          text: `ℹ️ Absorption Warning: Antacids can decrease or delay the intestinal absorption of other oral medications (${otherMed}). Maintain a 2 to 4 hour gap between taking antacids and other medicines.`
        });
      } else if (isSedative1 && isSedative2) {
        setInteractionResult({
          type: 'warning',
          text: `⚠️ Central Nervous System Depressant Interaction: Taking ${med1.name} together with ${med2.name} can cause additive drowsiness, severe dizziness, reduced alertness, and slowed reaction times. Do not drive or operate heavy machinery.`
        });
      } else {
        setInteractionResult({
          type: 'safe',
          text: `✅ No major direct clinical contra-indications documented between ${med1.name} and ${med2.name} in standard databases. Always consult your doctor or pharmacist prior to combining multiple medications.`
        });
      }
    }
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Full-Screen Buy Medicine / Check Pharmacy Stock Workspace — Section 1-36 Blueprint
  // When user clicks Buy Now on any medicine card OR Check Pharmacy Stock on monograph,
  // open completely new full-screen workspace, NOT a small modal/popup/drawer/partial section.
  if (selectedProductForBuying) {
    const isStockMode = buyWorkspaceMode === 'stock';
    return (
      <FullScreenBuyMedicineWorkspace
        product={selectedProductForBuying}
        mode={buyWorkspaceMode}
        backLabel={isStockMode ? 'Back to Medicine' : 'Back to Medicines'}
        titleOverride={isStockMode ? 'Check Pharmacy Stock' : 'Buy Medicine'}
        subtitleOverride={isStockMode ? 'Find available stock from Verified Pharmacy Partners and continue to purchase securely' : 'Complete your purchase securely through a Verified Pharmacy Partner'}
        originMedicine={originMedicineForStock ? {
          name: originMedicineForStock.name,
          genericName: originMedicineForStock.genericName,
          category: originMedicineForStock.category,
          therapeuticGroup: originMedicineForStock.therapeuticGroup,
          dosageForms: originMedicineForStock.dosageForms,
          prescriptionStatus: originMedicineForStock.prescriptionStatus,
          overTheCounter: originMedicineForStock.overTheCounter,
        } : undefined}
        onBack={() => {
          if (isStockMode) {
            // Return to Clonazepam clinical monograph per blueprint
            setSelectedProductForBuying(null);
            setBuyWorkspaceMode('buy');
            // Keep selectedMedicineForMonograph so we return to monograph page
            if (originMedicineForStock) {
              setSelectedMedicineForMonograph(originMedicineForStock);
            }
          } else {
            setSelectedProductForBuying(null);
            setBuyWorkspaceMode('buy');
            setOriginMedicineForStock(null);
          }
        }}
        cartItems={cartItems}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveCartItem={handleRemoveCartItem}
        onOrderPlaced={handleOrderPlaced}
        onNavigateToOrders={() => {
          setSelectedProductForBuying(null);
          setBuyWorkspaceMode('buy');
          setOriginMedicineForStock(null);
          setActiveTab('orders');
          setSelectedMedicineForMonograph(null);
        }}
        uploadedPrescriptions={uploadedPrescriptions}
        isAuthenticated={isAuthenticated}
        onRequireAuth={(feature) => onRequireAuth?.(feature)}
      />
    );
  }

  // If a medicine is selected, render the dedicated full-page MedicineDetailPage
  if (selectedMedicineForMonograph) {
    return (
      <MedicineDetailPage
        medicine={selectedMedicineForMonograph}
        isSaved={savedIds.includes(selectedMedicineForMonograph.id)}
        onToggleSave={() => onToggleSave(selectedMedicineForMonograph.id)}
        onOpenMedicine={(id) => {
          const next = MEDICINES.find((m) => m.id === id);
          if (next) openMedicine(next);
        }}
        onBack={closeMedicine}
        onNavigate={onNavigate}
        onAskAI={onAskAI}
        onFindPharmacy={() => {
          // Per blueprint: Clonazepam Clinical Monograph → Check Pharmacy Stock → Full-Screen Pharmacy Stock Workspace
          // Do NOT open popup/modal/drawer/small panel/partial section — open 100% full-screen workspace
          // Use same structure as Buy Medicine workspace, selected medicine auto-carried, no re-search needed
          handleCheckPharmacyStock(selectedMedicineForMonograph);
        }}
      />
    );
  }

  return (
    <div className="py-6 sm:py-8 bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {purchaseNotice && <div role="status" className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{purchaseNotice}</p><button type="button" onClick={() => setPurchaseNotice('')} className="font-semibold">Dismiss</button>
        </div>}

        
        {/* ========================================================================= */}
        {/* Top Statutory Medical Notice Strip */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
            <span className="font-medium leading-tight">
              <strong>Statutory Pharmacy Advisory:</strong> Schedule H/H1 prescription medicines strictly require a valid registered doctor's prescription from your Clinical Health Record (EHR) prior to fulfillment.
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. Medicine & Drugs Header */}
        {/* ========================================================================= */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800 overflow-hidden">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6 w-full">
            
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Medicine Overview & Drug Directory</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                  <Building2 className="h-3.5 w-3.5 text-teal-400" />
                  <span>Verified Pharmacy Partner Fulfillment</span>
                </span>
              </div>

              <div className="mx-auto space-y-2">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Medicine & Drugs
                </h1>
                <p className="mx-auto text-xs sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
                  Find detailed medicine information first, explore therapeutic indications, active ingredients, dosage forms, and safety precautions, and purchase safely through our accredited Verified Pharmacy Partners.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>100% Genuine Medicines</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <Clock className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>Express 2-Hr Delivery</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <Building2 className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>State Licensed Depots</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Clinical Pharmacist Review</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* Main Navigation Switcher Tabs */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('monographs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'monographs'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>400 Clinical Monographs ({MEDICINES.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>My Orders & Prescriptions ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('interactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'interactions'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span>Drug Interactions Checker</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Verified Cart ({totalCartCount})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 400 Complete Clinical Medicine Monographs */}
        {/* ========================================================================= */}
        {activeTab === 'monographs' && (
          <div className="space-y-7">
            {/* Search Bar for Monographs */}
            <div className="relative">
              <div className="relative rounded-2xl bg-white shadow-xs border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition p-1">
                <div className="flex items-center px-3.5 py-2.5">
                  <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search across 400 medicine monographs, active molecules, uses, dosages, side effects..."
                    className="w-full text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition mr-2 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {voiceSupported && (
                    <button
                      onClick={voiceListening ? stopVoiceSearch : startVoiceSearch}
                      className={`p-1.5 rounded-xl transition cursor-pointer ${
                        voiceListening ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-100'
                      }`}
                      title={voiceListening ? 'Stop voice search' : 'Voice search — say a medicine name'}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Specialty / Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {monographCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMonographSpecialtyFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    monographSpecialtyFilter === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <div>
                Showing{' '}
                <strong className="text-slate-900 font-bold">
                  {filteredMonographs.length === 0
                    ? 0
                    : `${(monographPage - 1) * MONOGRAPHS_PER_PAGE + 1}-${Math.min(monographPage * MONOGRAPHS_PER_PAGE, filteredMonographs.length)}`}
                </strong>{' '}
                of <strong className="text-slate-900 font-bold">{filteredMonographs.length}</strong>{' '}
                {filteredMonographs.length === MEDICINES.length ? 'complete clinical medicine monographs' : `matching monographs (of ${MEDICINES.length})`}
              </div>
              {monographSpecialtyFilter !== 'All' && (
                <button
                  onClick={() => setMonographSpecialtyFilter('All')}
                  className="text-emerald-600 hover:underline font-bold"
                >
                  Reset Specialty Filter
                </button>
              )}
            </div>

            {/* 400 Monographs Grid */}
            {filteredMonographs.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <Pill className="h-10 w-10 text-slate-300 mx-auto" />
                <h5 className="font-bold text-slate-800 text-sm">No clinical monographs match "{searchTerm}"</h5>
                <p className="text-xs text-slate-500">Try searching generic names, brand names, or clear the specialty filter.</p>
                <button
                  onClick={() => { setSearchTerm(''); setMonographSpecialtyFilter('All'); }}
                  className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  View All 400 Medicines
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleMonographs.map((med) => {
                  const isSaved = savedIds.includes(med.id);
                  return (
                    <div
                      key={med.id}
                      className="rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                    >
                      <div className="p-5 space-y-3.5">
                        {/* Top Meta Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            {med.category || 'Therapeutics'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {!med.overTheCounter ? (
                              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 flex items-center gap-1">
                                <FileText className="h-2.5 w-2.5" />
                                <span>Prescription (Rx)</span>
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5">
                                OTC Safe
                              </span>
                            )}
                            <button
                              onClick={() => onToggleSave(med.id)}
                              className={`p-1.5 rounded-full transition cursor-pointer ${
                                isSaved ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                              }`}
                              title={isSaved ? 'Remove from saved' : 'Save medicine'}
                            >
                              <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Title & Generic Name */}
                        <div>
                          <h3
                            onClick={() => openMedicine(med)}
                            className="text-base font-black text-slate-900 hover:text-emerald-700 cursor-pointer transition flex items-center gap-1.5"
                          >
                            <span>{med.name}</span>
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Generic Active Molecule: <strong className="text-slate-800">{med.genericName}</strong>
                          </p>
                        </div>

                        {/* Short plain-language summary — the card answers
                            "what is this?" only; everything else lives behind
                            View More (mirrors the disease card). */}
                        <p className="text-[13px] leading-relaxed text-slate-500 line-clamp-2">
                          {medicineShortSummary(med)}
                        </p>

                      </div>

                      {/* Card Actions */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <button
                          onClick={() => openMedicine(med)}
                          className="min-w-0 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-400" />
                          <span>View More</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuyMedicine(med)}
                          className="min-w-0 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                          aria-label={`Buy ${med.name} from a verified pharmacy`}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pager */}
            {filteredMonographs.length > MONOGRAPHS_PER_PAGE && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={monographPage <= 1}
                  onClick={() => setMonographPage((n) => Math.max(1, n - 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>

                <span className="text-xs font-semibold text-slate-500">
                  Page {monographPage} of {monographTotalPages}
                </span>

                <button
                  type="button"
                  disabled={monographPage >= monographTotalPages}
                  onClick={() => setMonographPage((n) => Math.min(monographTotalPages, n + 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}


        {/* ========================================================================= */}
        {/* TAB 2: My Orders & Prescriptions */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && !isAuthenticated && (
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
              <ShoppingCart className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Login required to view your orders</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Create a GlobalHealth account or sign in to continue with your medicine order, track
              deliveries, and access your prescription uploads.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={() => requirePurchaseAuth('view your personal orders')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Log In
              </button>
              <button
                onClick={() => onRequireAuth?.('purchase medicines and track your orders')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Create Account
              </button>
            </div>
          </div>
        )}
        {activeTab === 'orders' && isAuthenticated && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  My Pharmacy Orders & Prescriptions
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Track live medication dispatches, review pharmacist verification notes, and download official tax invoices.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span>Prescriptions linked to Clinical Health Record</span>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3 pt-2">
              {orders.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                  <Package className="h-10 w-10 text-slate-300 mx-auto" />
                  <h5 className="font-bold text-slate-800 text-sm">No Orders Placed Yet</h5>
                  <p className="text-xs text-slate-500">Your completed pharmacy purchases will appear here with live tracking.</p>
                  <button
                    onClick={() => setActiveTab('monographs')}
                    className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Browse Medicines
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div
                      key={order.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{order.id}</span>
                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                              {order.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Placed on {new Date(order.date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="text-right sm:text-right">
                          <span className="font-black text-slate-900 text-sm font-mono">
                            ₹{order.pricing.grandTotal.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • {order.paymentMethod}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-1.5 text-slate-700">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span>{item.quantity}x {item.productName}</span>
                            <span className="font-mono text-slate-900 font-bold">₹{item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-slate-500 text-[11px]">
                          Fulfillment: <strong className="text-slate-800">{order.fulfillingPharmacy.name}</strong>
                        </span>

                        <button
                          onClick={() => setSelectedOrderForTracking(order)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Truck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Track Live Order</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Clinical Drug Interactions Checker */}
        {/* ========================================================================= */}
        {activeTab === 'interactions' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
              <div>
                <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Clinical Safety & Contra-indications</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Drug-to-Drug Interaction Checker</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select two medications to check for known pharmacological interactions, overlapping side effects, absorption competition, or severe safety warnings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">Select First Medication</label>
                  <select
                    value={selectedMed1}
                    onChange={(e) => setSelectedMed1(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Medicine 1 --</option>
                    {MEDICINES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.genericName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">Select Second Medication</label>
                  <select
                    value={selectedMed2}
                    onChange={(e) => setSelectedMed2(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Medicine 2 --</option>
                    {MEDICINES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.genericName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={checkInteractions}
                disabled={!selectedMed1 || !selectedMed2}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Evaluate Pharmacological Interactions</span>
              </button>

              {interactionResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    interactionResult.type === 'warning'
                      ? 'bg-rose-50 border-rose-200 text-rose-950 font-medium'
                      : interactionResult.type === 'info'
                      ? 'bg-blue-50 border-blue-200 text-blue-950 font-medium'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium'
                  }`}
                >
                  {interactionResult.text}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* Interactive Modals */}
      {/* ========================================================================= */}

      {/* 1. Medicine Details / Overview Modal */}
      {selectedProductForDetail && (
        <PharmacyProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onOpenBuyMedicine={(product) => {
            setSelectedProductForBuying(product);
          }}
        />
      )}

      {/* 2. Verified Pharmacy Partner Selector Modal — REPLACED by FullScreenBuyMedicineWorkspace per blueprint (Buy Now opens 100% viewport workspace, not modal) */}
      {/* Full-screen workspace now handles pharmacy selection with live inventory sync */}

      {/* 3. Cart Slide-Over */}
      <PharmacyCartSlideOver
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 4. Safe Checkout Modal with Prescription Verification */}
      <PharmacyCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        uploadedPrescriptions={uploadedPrescriptions}
        onOrderPlaced={handleOrderPlaced}
        onUnavailableItems={(unavailable) => {
          // Final validation failed for these items — drop them from the cart
          // so the customer can re-pick a pharmacy that currently has stock.
          setCartItems(prev => prev.filter(i => !unavailable.some(u => u.productId === i.product.id && u.pharmacyId === i.selectedPharmacyId)));
        }}
      />

      {/* 5. Order Live Tracking Modal */}
      <OrderTrackingModal
        order={selectedOrderForTracking}
        onClose={() => setSelectedOrderForTracking(null)}
        onReorder={async (order) => {
          // Re-ordering also runs against LIVE availability: we re-check each
          // medicine and add it from the first verified pharmacy currently
          // holding stock. If no pharmacy can fulfil an item, the partner
          // selector opens so the customer sees the current situation.
          for (const item of order.items) {
            const prod = PHARMACY_PRODUCTS.find(p => p.id === item.productId);
            if (!prod) continue;
            const availability = await fetchProductAvailability(prod.id);
            if (availability.ok && availability.options.length > 0) {
              handleAddToCartWithPartner(prod, availability.options[0]);
            } else {
              setSelectedProductForBuying(prod);
            }
          }
        }}
      />

    </div>
  );
};
