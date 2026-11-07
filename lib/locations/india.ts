// lib/locations/india.ts
// Complete, structured geographical hierarchy for India
// Covering all 28 States and 8 Union Territories with official districts, major cities, and urban centres

import { GeographicLocation } from '../types';
import { UP_DISTRICTS, ALL_UP_DISTRICT_NAMES } from './uttar-pradesh';

export type StateOrUTType = 'state' | 'union_territory';

export interface DistrictMeta {
  name: string;
  headquarters: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
}

export interface StateOrUT {
  code: string; // ISO 3166-2:IN code suffix, e.g. 'UP', 'MH', 'DL'
  name: string;
  type: StateOrUTType;
  capital: string;
  districts: DistrictMeta[];
}

export const INDIAN_STATES_AND_UTS: StateOrUT[] = [
  // --- 28 STATES ---
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    type: 'state',
    capital: 'Amaravati',
    districts: [
      { name: 'Visakhapatnam', headquarters: 'Visakhapatnam', tier: 'tier_1', cities: ['Visakhapatnam', 'Gajuwaka', 'Anakapalle'], popularLocalities: ['MVP Colony', 'Siripuram', 'Gajuwaka', 'Beach Road', 'Madhurawada'] },
      { name: 'NTR', headquarters: 'Vijayawada', tier: 'tier_2', cities: ['Vijayawada', 'Ibrahimpatnam', 'Nandigama'], popularLocalities: ['Benz Circle', 'Bhavanipuram', 'Moghalrajpuram', 'Governorpet'] },
      { name: 'Guntur', headquarters: 'Guntur', tier: 'tier_2', cities: ['Guntur', 'Tenali', 'Mangalagiri'], popularLocalities: ['Brodipet', 'Arundelpet', 'Kothapet'] },
      { name: 'Tirupati', headquarters: 'Tirupati', tier: 'tier_2', cities: ['Tirupati', 'Srikalahasti', 'Gudur'], popularLocalities: ['Alipiri', 'Bhavani Nagar', 'Korlagunta', 'Renigunta'] },
      { name: 'Kurnool', headquarters: 'Kurnool', tier: 'tier_2', cities: ['Kurnool', 'Adoni', 'Yemmiganur'], popularLocalities: ['Nandyal Road', 'Birla Gate', 'Budhawarapeta'] },
      { name: 'Nellore', headquarters: 'Nellore', tier: 'tier_2', cities: ['Nellore', 'Kavali', 'Gudur'], popularLocalities: ['Trunk Road', 'Pogathota', 'Magunta Layout'] },
      { name: 'Kakinada', headquarters: 'Kakinada', tier: 'tier_2', cities: ['Kakinada', 'Pithapuram', 'Samalkot'], popularLocalities: ['Bhanugudi Junction', 'Cinema Road', 'Suryaraopeta'] },
      { name: 'Anantapur', headquarters: 'Anantapur', tier: 'tier_3', cities: ['Anantapur', 'Guntakal', 'Dharmavaram'], popularLocalities: ['Subash Road', 'Kamalanagar', 'Court Road'] },
      { name: 'Kadapa', headquarters: 'Kadapa', tier: 'tier_3', cities: ['Kadapa', 'Proddatur', 'Pulivendula'], popularLocalities: ['Yerramukkapalli', 'Nagarajupalle', 'Seven Roads'] },
      { name: 'East Godavari', headquarters: 'Rajahmundry', tier: 'tier_2', cities: ['Rajahmundry', 'Mandapeta', 'Rajanagaram'], popularLocalities: ['Danavaipeta', 'Morampudi', 'Kotipalli Bus Stand'] },
      { name: 'West Godavari', headquarters: 'Bhimavaram', tier: 'tier_2', cities: ['Bhimavaram', 'Tadepalligudem', 'Tanuku'], popularLocalities: ['Somavaram', 'Housing Board', 'Balusumoodi'] },
      { name: 'Srikakulam', headquarters: 'Srikakulam', tier: 'tier_3', cities: ['Srikakulam', 'Palasa', 'Amadalavalasa'], popularLocalities: ['Seven Road Junction', 'PN Colony'] },
      { name: 'Vizianagaram', headquarters: 'Vizianagaram', tier: 'tier_3', cities: ['Vizianagaram', 'Bobbili', 'Salur'], popularLocalities: ['Cantonment', 'RTC Complex Area'] },
      { name: 'Prakasam', headquarters: 'Ongole', tier: 'tier_3', cities: ['Ongole', 'Chirala', 'Markapur'], popularLocalities: ['Trunk Road', 'Kurnool Road'] },
      { name: 'Eluru', headquarters: 'Eluru', tier: 'tier_3', cities: ['Eluru', 'Jangareddygudem', 'Nuzvid'], popularLocalities: ['Powerpet', 'Sanivarapupeta'] }
    ]
  },
  {
    code: 'AR',
    name: 'Arunachal Pradesh',
    type: 'state',
    capital: 'Itanagar',
    districts: [
      { name: 'Papum Pare', headquarters: 'Yupia', tier: 'tier_2', cities: ['Itanagar', 'Naharlagun', 'Yupia'], popularLocalities: ['Ganga Market', 'E-Sector', 'Zero Point', 'Bank Tinali'] },
      { name: 'Changlang', headquarters: 'Changlang', tier: 'tier_3', cities: ['Changlang', 'Miao', 'Jairampur'], popularLocalities: ['Main Market', 'Forest Colony'] },
      { name: 'West Kameng', headquarters: 'Bomdila', tier: 'tier_3', cities: ['Bomdila', 'Dirang', 'Rupa'], popularLocalities: ['Bazaar Line', 'Craft Centre'] },
      { name: 'Tawang', headquarters: 'Tawang', tier: 'tier_3', cities: ['Tawang', 'Lumla', 'Jang'], popularLocalities: ['Old Market', 'New Market', 'Monastery Road'] },
      { name: 'East Siang', headquarters: 'Pasighat', tier: 'tier_3', cities: ['Pasighat', 'Ruksin', 'Mebo'], popularLocalities: ['Main Bazaar', 'Gumin Nagar'] },
      { name: 'Lower Subansiri', headquarters: 'Ziro', tier: 'tier_3', cities: ['Ziro', 'Hapoli', 'Yachuli'], popularLocalities: ['Hapoli Market', 'Old Ziro'] }
    ]
  },
  {
    code: 'AS',
    name: 'Assam',
    type: 'state',
    capital: 'Dispur',
    districts: [
      { name: 'Kamrup Metropolitan', headquarters: 'Guwahati', tier: 'tier_1', cities: ['Guwahati', 'Dispur', 'North Guwahati'], popularLocalities: ['Paltan Bazaar', 'GS Road', 'Christian Basti', 'Ulubari', 'Ganeshguri', 'Pan Bazaar', 'Six Mile'] },
      { name: 'Dibrugarh', headquarters: 'Dibrugarh', tier: 'tier_2', cities: ['Dibrugarh', 'Naharkatia', 'Chabua'], popularLocalities: ['New Market', 'Amolapatty', 'Chowkidinghee'] },
      { name: 'Cachar', headquarters: 'Silchar', tier: 'tier_2', cities: ['Silchar', 'Lakhipur', 'Sonai'], popularLocalities: ['Central Road', 'Tarapur', 'Rangirkhari'] },
      { name: 'Jorhat', headquarters: 'Jorhat', tier: 'tier_2', cities: ['Jorhat', 'Mariani', 'Titabor'], popularLocalities: ['Gar-Ali', 'AT Road', 'Tarajan'] },
      { name: 'Nagaon', headquarters: 'Nagaon', tier: 'tier_2', cities: ['Nagaon', 'Hojai', 'Raha'], popularLocalities: ['Haibargaon', 'Daccapatty', 'Christianpatty'] },
      { name: 'Sonitpur', headquarters: 'Tezpur', tier: 'tier_2', cities: ['Tezpur', 'Dhekiajuli', 'Rangapara'], popularLocalities: ['Main Market', 'Mission Chariali', 'Civil Lines'] },
      { name: 'Tinsukia', headquarters: 'Tinsukia', tier: 'tier_2', cities: ['Tinsukia', 'Digboi', 'Doomdooma'], popularLocalities: ['Chirwapatty', 'Daily Bazaar', 'Bordoloi Nagar'] },
      { name: 'Kamrup Rural', headquarters: 'Amingaon', tier: 'tier_3', cities: ['Rangia', 'Palasbari', 'Boko'], popularLocalities: ['Rangia Town', 'Station Road'] }
    ]
  },
  {
    code: 'BR',
    name: 'Bihar',
    type: 'state',
    capital: 'Patna',
    districts: [
      { name: 'Patna', headquarters: 'Patna', tier: 'tier_1', cities: ['Patna', 'Danapur', 'Phulwari Sharif', 'Khagaul', 'Barh'], popularLocalities: ['Boring Road', 'Frazer Road', 'Kankarbagh', 'Bailey Road', 'Rajendra Nagar', 'Patliputra Colony', 'Exhibition Road'] },
      { name: 'Gaya', headquarters: 'Gaya', tier: 'tier_2', cities: ['Gaya', 'Bodh Gaya', 'Sherghati', 'Tekari'], popularLocalities: ['Civil Lines', 'Rampur', 'GB Road', 'Station Road'] },
      { name: 'Bhagalpur', headquarters: 'Bhagalpur', tier: 'tier_2', cities: ['Bhagalpur', 'Naugachhia', 'Kahalgaon'], popularLocalities: ['Khalifabag', 'Suja Ganj', 'Tilkamanjhi', 'Zero Mile'] },
      { name: 'Muzaffarpur', headquarters: 'Muzaffarpur', tier: 'tier_2', cities: ['Muzaffarpur', 'Kanti', 'Motipur'], popularLocalities: ['Motijheel', 'Sutapatti', 'Kalyani', 'Aghoria Bazar'] },
      { name: 'Purnia', headquarters: 'Purnia', tier: 'tier_2', cities: ['Purnia', 'Kasba', 'Banmankhi'], popularLocalities: ['Line Bazar', 'Bhatta Bazar', 'Navratan Hatta'] },
      { name: 'Darbhanga', headquarters: 'Darbhanga', tier: 'tier_2', cities: ['Darbhanga', 'Benipur', 'Laheriasarai'], popularLocalities: ['Laheriasarai Tower', 'Donar', 'Lalbagh'] },
      { name: 'Begusarai', headquarters: 'Begusarai', tier: 'tier_2', cities: ['Begusarai', 'Barauni', 'Teghra'], popularLocalities: ['Main Market', 'Har-Har Mahadev Chowk', 'Power House Chowk'] },
      { name: 'Nalanda', headquarters: 'Bihar Sharif', tier: 'tier_2', cities: ['Bihar Sharif', 'Rajgir', 'Hilsa', 'Islampur'], popularLocalities: ['Ranchi Road', 'Hospital Mor', 'Khandak Par'] },
      { name: 'Rohtas', headquarters: 'Sasaram', tier: 'tier_3', cities: ['Sasaram', 'Dehri', 'Nokha'], popularLocalities: ['GT Road', 'Dharamsabha', 'Station Area'] },
      { name: 'Saran', headquarters: 'Chhapra', tier: 'tier_3', cities: ['Chhapra', 'Revelganj', 'Sonpur'], popularLocalities: ['Municipality Chowk', 'Salempur', 'Dahiyawan'] },
      { name: 'Vaishali', headquarters: 'Hajipur', tier: 'tier_2', cities: ['Hajipur', 'Mahnar', 'Lalganj'], popularLocalities: ['Cinema Road', 'Anwarpur', 'Station Road'] },
      { name: 'Samastipur', headquarters: 'Samastipur', tier: 'tier_3', cities: ['Samastipur', 'Dalsinghsarai', 'Rosera'], popularLocalities: ['Station Road', 'Gudri Bazar'] }
    ]
  },
  {
    code: 'CG',
    name: 'Chhattisgarh',
    type: 'state',
    capital: 'Raipur',
    districts: [
      { name: 'Raipur', headquarters: 'Raipur', tier: 'tier_1', cities: ['Raipur', 'Nava Raipur', 'Tilda Newra', 'Arang'], popularLocalities: ['Telibandha', 'Pandri', 'Shankar Nagar', 'Civil Lines', 'VIP Road', 'Samta Colony', 'Tatibandh'] },
      { name: 'Durg', headquarters: 'Durg', tier: 'tier_2', cities: ['Bhilai', 'Durg', 'Kumhari', 'Patan'], popularLocalities: ['Civic Centre Bhilai', 'Sector 6', 'Nehru Nagar', 'Supela', 'Indira Market'] },
      { name: 'Bilaspur', headquarters: 'Bilaspur', tier: 'tier_2', cities: ['Bilaspur', 'Ratanpur', 'Kota', 'Takhatpur'], popularLocalities: ['Vyapar Vihar', 'Link Road', 'Civil Lines', 'Rama Magneto Area', 'Telipara'] },
      { name: 'Korba', headquarters: 'Korba', tier: 'tier_2', cities: ['Korba', 'Katghora', 'Dipka'], popularLocalities: ['Transport Nagar', 'TP Nagar', 'Niharika', 'Kosabadi'] },
      { name: 'Rajnandgaon', headquarters: 'Rajnandgaon', tier: 'tier_3', cities: ['Rajnandgaon', 'Dongargarh', 'Khairagarh'], popularLocalities: ['Ganj Line', 'Cinema Line', 'Manpur Mohalla'] },
      { name: 'Jagdalpur (Bastar)', headquarters: 'Jagdalpur', tier: 'tier_3', cities: ['Jagdalpur', 'Bastar', 'Nagarnar'], popularLocalities: ['Sanjay Market', 'Dharampura', 'Kumharpara'] },
      { name: 'Raigarh', headquarters: 'Raigarh', tier: 'tier_2', cities: ['Raigarh', 'Kharsia', 'Sarangarh'], popularLocalities: ['Station Road', 'Gauri Shankar Mandir Chowk', 'Subhash Chowk'] }
    ]
  },
  {
    code: 'GA',
    name: 'Goa',
    type: 'state',
    capital: 'Panaji',
    districts: [
      { name: 'North Goa', headquarters: 'Panaji', tier: 'tier_1', cities: ['Panaji', 'Mapusa', 'Calangute', 'Candolim', 'Bicholim', 'Pernem'], popularLocalities: ['Fontainhas', 'Miramar', 'Calangute Beach Road', 'Candolim Main Road', 'Anjuna', 'Vagator', 'Mapusa Market', 'Porvorim'] },
      { name: 'South Goa', headquarters: 'Margao', tier: 'tier_1', cities: ['Margao', 'Vasco da Gama', 'Ponda', 'Curchorem', 'Canacona'], popularLocalities: ['Colva Beach Road', 'Benaulim', 'Margao Municipal Market', 'Fatorda', 'Vasco Clock Tower', 'Palolem'] }
    ]
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    type: 'state',
    capital: 'Gandhinagar',
    districts: [
      { name: 'Ahmedabad', headquarters: 'Ahmedabad', tier: 'tier_1', cities: ['Ahmedabad', 'Sanand', 'Bavla', 'Dholka'], popularLocalities: ['CG Road', 'SG Highway', 'Prahlad Nagar', 'Bodakdev', 'Navrangpura', 'Vastrapur', 'Maninagar', 'Satellite', 'Sindhu Bhavan Road'] },
      { name: 'Surat', headquarters: 'Surat', tier: 'tier_1', cities: ['Surat', 'Bardoli', 'Mandvi'], popularLocalities: ['Ghod Dod Road', 'Vesu', 'Adajan', 'Varachha', 'Piplod', 'Ring Road', 'Athwalines'] },
      { name: 'Vadodara', headquarters: 'Vadodara', tier: 'tier_1', cities: ['Vadodara', 'Padra', 'Dabhoi'], popularLocalities: ['Alkapuri', 'Gotri', 'Fatehgunj', 'Manjalpur', 'Sayajigunj', 'Karelibaug'] },
      { name: 'Rajkot', headquarters: 'Rajkot', tier: 'tier_1', cities: ['Rajkot', 'Gondal', 'Jetpur'], popularLocalities: ['Kalavad Road', 'Yagnik Road', '150 Feet Ring Road', 'Kotecha Chowk', 'University Road'] },
      { name: 'Gandhinagar', headquarters: 'Gandhinagar', tier: 'tier_1', cities: ['Gandhinagar', 'Kalol', 'Mansa', 'GIFT City'], popularLocalities: ['Sector 11', 'Sector 21', 'Kudasan', 'Infocity', 'Sargasan', 'Randesan'] },
      { name: 'Bhavnagar', headquarters: 'Bhavnagar', tier: 'tier_2', cities: ['Bhavnagar', 'Palitana', 'Mahuva'], popularLocalities: ['Waghawadi Road', 'Kalanala', 'Ghogha Circle'] },
      { name: 'Jamnagar', headquarters: 'Jamnagar', tier: 'tier_2', cities: ['Jamnagar', 'Dhrol', 'Kalavad'], popularLocalities: ['Indira Marg', 'Limda Lane', 'Patel Colony'] },
      { name: 'Junagadh', headquarters: 'Junagadh', tier: 'tier_2', cities: ['Junagadh', 'Keshod', 'Mangrol'], popularLocalities: ['Zanzarda Road', 'Moti Baug', 'College Road'] },
      { name: 'Kutch', headquarters: 'Bhuj', tier: 'tier_2', cities: ['Bhuj', 'Gandhidham', 'Anjar', 'Mundra'], popularLocalities: ['Oslo Circle Gandhidham', 'Station Road Bhuj', 'Hospital Road'] },
      { name: 'Anand', headquarters: 'Anand', tier: 'tier_2', cities: ['Anand', 'Vallabh Vidyanagar', 'Khambhat'], popularLocalities: ['Vidyanagar Road', 'Amul Dairy Road', 'Nana Bazar'] },
      { name: 'Bharuch', headquarters: 'Bharuch', tier: 'tier_2', cities: ['Bharuch', 'Ankleshwar', 'Jambusar'], popularLocalities: ['Station Road', 'GIDC Ankleshwar', 'Zadeshwar Road'] },
      { name: 'Mehsana', headquarters: 'Mehsana', tier: 'tier_2', cities: ['Mehsana', 'Kadi', 'Visnagar', 'Unjha'], popularLocalities: ['Radhanpur Road', 'Modhera Road', 'Human Mandir Chowk'] },
      { name: 'Valsad', headquarters: 'Valsad', tier: 'tier_2', cities: ['Valsad', 'Vapi', 'Pardi', 'Umbergaon'], popularLocalities: ['GIDC Vapi', 'Dharampur Road', 'Tithal Road'] }
    ]
  },
  {
    code: 'HR',
    name: 'Haryana',
    type: 'state',
    capital: 'Chandigarh',
    districts: [
      { name: 'Gurugram', headquarters: 'Gurugram', tier: 'tier_1', cities: ['Gurugram', 'Sohna', 'Pataudi', 'Manesar'], popularLocalities: ['Cyber Hub', 'Golf Course Road', 'Sector 29', 'MG Road', 'Galleria Market', 'Sohna Road', 'DLF Phase 1-5', 'Sector 56'] },
      { name: 'Faridabad', headquarters: 'Faridabad', tier: 'tier_1', cities: ['Faridabad', 'Ballabhgarh'], popularLocalities: ['Sector 15', 'Sector 16', 'NIT Faridabad', 'Mathura Road', 'Green Field', 'Neharpar'] },
      { name: 'Panipat', headquarters: 'Panipat', tier: 'tier_2', cities: ['Panipat', 'Samalkha'], popularLocalities: ['Model Town', 'GT Road', 'Assandh Road', 'Sector 11-12'] },
      { name: 'Ambala', headquarters: 'Ambala', tier: 'tier_2', cities: ['Ambala Cantt', 'Ambala City'], popularLocalities: ['Sadar Bazaar', 'Model Town', 'Nicholson Road', 'Jagadhri Road'] },
      { name: 'Karnal', headquarters: 'Karnal', tier: 'tier_2', cities: ['Karnal', 'Gharaunda', 'Assandh'], popularLocalities: ['Sector 12', 'Mughal Canal', 'Model Town', 'Kunjpura Road'] },
      { name: 'Hisar', headquarters: 'Hisar', tier: 'tier_2', cities: ['Hisar', 'Hansi', 'Barwala'], popularLocalities: ['Urban Estate II', 'Rajguru Market', 'Delhi Road', 'Model Town'] },
      { name: 'Rohtak', headquarters: 'Rohtak', tier: 'tier_2', cities: ['Rohtak', 'Meham', 'Sampla'], popularLocalities: ['Model Town', 'Delhi Road', 'Sector 1-4', 'Quilla Road'] },
      { name: 'Sonipat', headquarters: 'Sonipat', tier: 'tier_2', cities: ['Sonipat', 'Ganaur', 'Gohana', 'Kundli'], popularLocalities: ['Sector 14', 'Sector 15', 'Murthal Dhabas', 'Subhash Chowk'] },
      { name: 'Panchkula', headquarters: 'Panchkula', tier: 'tier_1', cities: ['Panchkula', 'Kalka', 'Pinjore'], popularLocalities: ['Sector 5', 'Sector 8', 'Sector 9', 'MDC Sector 5', 'Sector 20'] },
      { name: 'Yamunanagar', headquarters: 'Yamunanagar', tier: 'tier_2', cities: ['Yamunanagar', 'Jagadhri'], popularLocalities: ['Model Town', 'Nehru Park Area', 'Railway Road'] },
      { name: 'Kurukshetra', headquarters: 'Kurukshetra', tier: 'tier_3', cities: ['Thanesar', 'Pehowa', 'Shahbad'], popularLocalities: ['Pipli Road', 'Sector 13', 'Brahma Sarovar Marg'] },
      { name: 'Rewari', headquarters: 'Rewari', tier: 'tier_3', cities: ['Rewari', 'Bawal', 'Dharuhera'], popularLocalities: ['Model Town', 'Circular Road', 'Brass Market'] }
    ]
  },
  {
    code: 'HP',
    name: 'Himachal Pradesh',
    type: 'state',
    capital: 'Shimla',
    districts: [
      { name: 'Shimla', headquarters: 'Shimla', tier: 'tier_1', cities: ['Shimla', 'Kufri', 'Rampur', 'Rohru'], popularLocalities: ['Mall Road', 'The Ridge', 'Lakkar Bazaar', 'Chotta Shimla', 'Sanjauli', 'Boileauganj'] },
      { name: 'Kangra', headquarters: 'Dharamshala', tier: 'tier_1', cities: ['Dharamshala', 'McLeod Ganj', 'Kangra', 'Palampur'], popularLocalities: ['Kotwali Bazaar', 'Bhagsunag', 'Dharamkot', 'Palampur Main Market'] },
      { name: 'Kullu', headquarters: 'Kullu', tier: 'tier_1', cities: ['Manali', 'Kullu', 'Bhuntar', 'Naggar'], popularLocalities: ['Old Manali', 'Mall Road Manali', 'Vashisht', 'Dhalpur Ground'] },
      { name: 'Solan', headquarters: 'Solan', tier: 'tier_2', cities: ['Solan', 'Kasauli', 'Baddi', 'Nalagarh'], popularLocalities: ['Mall Road Solan', 'Heritage Market Kasauli', 'Chambaghat'] },
      { name: 'Mandi', headquarters: 'Mandi', tier: 'tier_2', cities: ['Mandi', 'Sundernagar', 'Jogindernagar'], popularLocalities: ['Indira Market', 'Bhootnath Bazaar', 'Victoria Suspension Bridge Area'] },
      { name: 'Sirmaur', headquarters: 'Nahan', tier: 'tier_3', cities: ['Nahan', 'Paonta Sahib'], popularLocalities: ['Bada Chowk', 'Gurudwara Road Paonta Sahib'] },
      { name: 'Una', headquarters: 'Una', tier: 'tier_3', cities: ['Una', 'Mehatpur', 'Amb'], popularLocalities: ['Main Market', 'Chandigarh Road'] },
      { name: 'Hamirpur', headquarters: 'Hamirpur', tier: 'tier_3', cities: ['Hamirpur', 'Nadaun', 'Bhoranj'], popularLocalities: ['Gandhi Chowk', 'Anu', 'Salasi'] },
      { name: 'Bilaspur (HP)', headquarters: 'Bilaspur', tier: 'tier_3', cities: ['Bilaspur', 'Ghumarwin'], popularLocalities: ['Main Market', 'Dholra'] },
      { name: 'Chamba', headquarters: 'Chamba', tier: 'tier_3', cities: ['Chamba', 'Dalhousie'], popularLocalities: ['Chaugan', 'Subhash Chowk Dalhousie', 'Gandhi Chowk Dalhousie'] }
    ]
  },
  {
    code: 'JH',
    name: 'Jharkhand',
    type: 'state',
    capital: 'Ranchi',
    districts: [
      { name: 'Ranchi', headquarters: 'Ranchi', tier: 'tier_1', cities: ['Ranchi', 'Kanke', 'Hatia', 'Bundu'], popularLocalities: ['Main Road', 'Lalpur', 'Harmu Housing Colony', 'Doranda', 'Hinoo', 'Morabadi', 'Ashok Nagar'] },
      { name: 'East Singhbhum', headquarters: 'Jamshedpur', tier: 'tier_1', cities: ['Jamshedpur', 'Ghatshila', 'Jugsalai'], popularLocalities: ['Bistupur', 'Sakchi', 'Kadma', 'Sonari', 'Telco Colony', 'Golmuri'] },
      { name: 'Dhanbad', headquarters: 'Dhanbad', tier: 'tier_1', cities: ['Dhanbad', 'Jharia', 'Sindri', 'Katras'], popularLocalities: ['Bank More', 'Saraidhela', 'Hirapur', 'Steel Gate', 'Dhaiya'] },
      { name: 'Bokaro', headquarters: 'Bokaro Steel City', tier: 'tier_2', cities: ['Bokaro Steel City', 'Chas', 'Bermo'], popularLocalities: ['Sector 4', 'City Centre', 'Chas Main Road', 'Sector 1'] },
      { name: 'Hazaribagh', headquarters: 'Hazaribagh', tier: 'tier_2', cities: ['Hazaribagh', 'Barhi'], popularLocalities: ['Ananda Chowk', 'Indrapuri Chowk', 'PTC Chowk'] },
      { name: 'Deoghar', headquarters: 'Deoghar', tier: 'tier_2', cities: ['Deoghar', 'Madhupur'], popularLocalities: ['Tower Chowk', 'Castairs Town', 'Babadham Complex', 'VIP Chowk'] },
      { name: 'Giridih', headquarters: 'Giridih', tier: 'tier_3', cities: ['Giridih', 'Dumri'], popularLocalities: ['Makatpur', 'Bada Chowk', 'Court Road'] },
      { name: 'Palamu', headquarters: 'Medininagar', tier: 'tier_3', cities: ['Medininagar (Daltonganj)', 'Bishrampur'], popularLocalities: ['Chhata Chowk', 'Main Road'] }
    ]
  },
  {
    code: 'KA',
    name: 'Karnataka',
    type: 'state',
    capital: 'Bengaluru',
    districts: [
      { name: 'Bengaluru Urban', headquarters: 'Bengaluru', tier: 'tier_1', cities: ['Bengaluru', 'Yelahanka', 'Anekal', 'Kengeri'], popularLocalities: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 'JP Nagar', 'MG Road', 'Church Street', 'Malleshwaram', 'Electronic City', 'Bellandur', 'Marathahalli'] },
      { name: 'Bengaluru Rural', headquarters: 'Bengaluru', tier: 'tier_2', cities: ['Doddaballapura', 'Devanahalli', 'Nelamangala', 'Hosakote'], popularLocalities: ['Airport Road', 'Nelamangala Town', 'Hosakote High Street'] },
      { name: 'Mysuru', headquarters: 'Mysuru', tier: 'tier_1', cities: ['Mysuru', 'Hunsur', 'Nanjangud'], popularLocalities: ['Gokulam', 'Jayalakshmipuram', 'Vontikoppal', 'Saraswathipuram', 'Devaraja Market', 'Kuvempunagar'] },
      { name: 'Dharwad', headquarters: 'Hubballi-Dharwad', tier: 'tier_2', cities: ['Hubballi', 'Dharwad', 'Navalgund'], popularLocalities: ['Koppikar Road', 'Vidyanagar Hubballi', 'Line Bazaar Dharwad', 'Shirur Park'] },
      { name: 'Dakshina Kannada', headquarters: 'Mangaluru', tier: 'tier_1', cities: ['Mangaluru', 'Puttur', 'Bantwal', 'Surathkal'], popularLocalities: ['Hampankatta', 'Kadri', 'Kodialbail', 'Lalbagh', 'Balmatta', 'Bejai'] },
      { name: 'Belagavi', headquarters: 'Belagavi', tier: 'tier_2', cities: ['Belagavi', 'Gokak', 'Chikkodi'], popularLocalities: ['Tilakwadi', 'Camp Area', 'Khade Bazaar', 'Udyambag'] },
      { name: 'Kalaburagi', headquarters: 'Kalaburagi', tier: 'tier_2', cities: ['Kalaburagi', 'Sedam', 'Shahabad'], popularLocalities: ['Super Market', 'MSK Mill Area', 'Station Road'] },
      { name: 'Tumakuru', headquarters: 'Tumakuru', tier: 'tier_2', cities: ['Tumakuru', 'Tiptur', 'Sira'], popularLocalities: ['MG Road', 'B.H. Road', 'Siddaganga Extension'] },
      { name: 'Shivamogga', headquarters: 'Shivamogga', tier: 'tier_2', cities: ['Shivamogga', 'Bhadravati', 'Sagar'], popularLocalities: ['Nehru Road', 'Gandhi Bazaar', 'Durgigudi'] },
      { name: 'Udupi', headquarters: 'Udupi', tier: 'tier_2', cities: ['Udupi', 'Manipal', 'Kundapura', 'Karkala'], popularLocalities: ['Tiger Circle Manipal', 'Car Street Udupi', 'Kalsanka', 'MIT Campus Area'] },
      { name: 'Ballari', headquarters: 'Ballari', tier: 'tier_2', cities: ['Ballari', 'Siruguppa'], popularLocalities: ['Car Street', 'Infantry Road', 'Station Road'] },
      { name: 'Davangere', headquarters: 'Davangere', tier: 'tier_2', cities: ['Davangere', 'Harihar'], popularLocalities: ['Dental College Road', 'MCC B Block', 'Jayadeva Circle', 'PB Road'] }
    ]
  },
  {
    code: 'KL',
    name: 'Kerala',
    type: 'state',
    capital: 'Thiruvananthapuram',
    districts: [
      { name: 'Thiruvananthapuram', headquarters: 'Thiruvananthapuram', tier: 'tier_1', cities: ['Thiruvananthapuram', 'Neyyattinkara', 'Attingal', 'Varkala'], popularLocalities: ['Kowdiar', 'Vazhuthacaud', 'Pattom', 'Palayam', 'Kazhakoottam (Technopark)', 'MG Road', 'Varkala Cliff'] },
      { name: 'Ernakulam', headquarters: 'Kochi', tier: 'tier_1', cities: ['Kochi', 'Aluva', 'Kakkanad (Infopark)', 'Perumbavoor', 'Angamaly'], popularLocalities: ['Panampilly Nagar', 'MG Road Ernakulam', 'Marine Drive', 'Kaloor', 'Palarivattom', 'Fort Kochi', 'Edappally', 'Kakkanad'] },
      { name: 'Kozhikode', headquarters: 'Kozhikode', tier: 'tier_1', cities: ['Kozhikode', 'Vadakara', 'Koyilandy'], popularLocalities: ['SM Street', 'Mavoor Road', 'Beach Road', 'Thondayad Bypass', 'PT Usha Road'] },
      { name: 'Thrissur', headquarters: 'Thrissur', tier: 'tier_1', cities: ['Thrissur', 'Chalakudy', 'Guruvayur', 'Kodungallur'], popularLocalities: ['Round South/North', 'East Fort', 'Kuruppam Road', 'Puzhakkal'] },
      { name: 'Kottayam', headquarters: 'Kottayam', tier: 'tier_2', cities: ['Kottayam', 'Changanassery', 'Pala'], popularLocalities: ['Kanjikuzhy', 'Collectorate', 'Baker Junction', 'Nagampadam'] },
      { name: 'Kollam', headquarters: 'Kollam', tier: 'tier_2', cities: ['Kollam', 'Karunagappalli', 'Paravur'], popularLocalities: ['Chinnakada', 'Asramam', 'Beach Road', 'Kadakkal'] },
      { name: 'Kannur', headquarters: 'Kannur', tier: 'tier_2', cities: ['Kannur', 'Thalassery', 'Payyanur'], popularLocalities: ['Fort Road', 'South Bazaar', 'Thavakkara', 'Pilathara'] },
      { name: 'Alappuzha', headquarters: 'Alappuzha', tier: 'tier_2', cities: ['Alappuzha', 'Cherthala', 'Kayamkulam'], popularLocalities: ['Mullakkal', 'Boat Jetty Road', 'Beach Road Alappuzha'] },
      { name: 'Palakkad', headquarters: 'Palakkad', tier: 'tier_2', cities: ['Palakkad', 'Ottapalam', 'Chittur'], popularLocalities: ['TB Road', 'Robinson Road', 'Fort Maidan Area'] },
      { name: 'Malappuram', headquarters: 'Malappuram', tier: 'tier_2', cities: ['Malappuram', 'Manjeri', 'Perinthalmanna', 'Tirur'], popularLocalities: ['Kottakkal', 'Up Hill', 'Kozhikode Road'] },
      { name: 'Wayanad', headquarters: 'Kalpetta', tier: 'tier_2', cities: ['Kalpetta', 'Sulthan Bathery', 'Mananthavady'], popularLocalities: ['Main Street Kalpetta', 'Chundale', 'Vythiri'] }
    ]
  },
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    type: 'state',
    capital: 'Bhopal',
    districts: [
      { name: 'Indore', headquarters: 'Indore', tier: 'tier_1', cities: ['Indore', 'Mhow', 'Sanwer', 'Depalpur'], popularLocalities: ['Vijay Nagar', 'Chappan Dukan', 'Sarafa Bazaar', 'Palasia', 'Bhawarkua', 'AB Road', 'Rau', 'Sapna Sangeeta'] },
      { name: 'Bhopal', headquarters: 'Bhopal', tier: 'tier_1', cities: ['Bhopal', 'Berasia'], popularLocalities: ['MP Nagar', 'Arera Colony', 'New Market', 'Shahpura', 'Hoshangabad Road', 'Kolar Road', 'Bittan Market'] },
      { name: 'Jabalpur', headquarters: 'Jabalpur', tier: 'tier_2', cities: ['Jabalpur', 'Sihora', 'Patan'], popularLocalities: ['Civic Center', 'Wright Town', 'Napier Town', 'Gorakhpur', 'Sadar Bazar'] },
      { name: 'Gwalior', headquarters: 'Gwalior', tier: 'tier_2', cities: ['Gwalior', 'Dabra', 'Morar'], popularLocalities: ['City Centre', 'Lashkar', 'Jayendraganj', 'Maharaj Bada', 'Padav'] },
      { name: 'Ujjain', headquarters: 'Ujjain', tier: 'tier_2', cities: ['Ujjain', 'Nagda', 'Mahidpur'], popularLocalities: ['Freeganj', 'Mahakal Mandir Marg', 'Tower Chowk', 'Nanakheda'] },
      { name: 'Sagar', headquarters: 'Sagar', tier: 'tier_3', cities: ['Sagar', 'Bina', 'Khurai'], popularLocalities: ['Katra Bazar', 'Civil Lines', 'Gujarati Bazar'] },
      { name: 'Rewa', headquarters: 'Rewa', tier: 'tier_3', cities: ['Rewa', 'Mauganj'], popularLocalities: ['Kothi Compound', 'Civil Lines', 'Shilpi Plaza'] },
      { name: 'Satna', headquarters: 'Satna', tier: 'tier_3', cities: ['Satna', 'Maihar'], popularLocalities: ['Rewa Road', 'Station Road', 'Panna Naka'] },
      { name: 'Ratlam', headquarters: 'Ratlam', tier: 'tier_3', cities: ['Ratlam', 'Jaora'], popularLocalities: ['Do Batti', 'Station Road', 'Chandni Chowk'] }
    ]
  },
  {
    code: 'MH',
    name: 'Maharashtra',
    type: 'state',
    capital: 'Mumbai',
    districts: [
      { name: 'Mumbai City', headquarters: 'Mumbai', tier: 'tier_1', cities: ['South Mumbai'], popularLocalities: ['Colaba', 'Fort', 'Nariman Point', 'Marine Drive', 'Lower Parel', 'Worli', 'Dadar', 'Byculla'] },
      { name: 'Mumbai Suburban', headquarters: 'Bandra', tier: 'tier_1', cities: ['Mumbai Suburban'], popularLocalities: ['Bandra West', 'Andheri West', 'Andheri East', 'Juhu', 'Powai', 'BKC', 'Borivali West', 'Goregaon West', 'Malad West', 'Ghatkopar'] },
      { name: 'Pune', headquarters: 'Pune', tier: 'tier_1', cities: ['Pune', 'Pimpri-Chinchwad', 'Baramati'], popularLocalities: ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'FC Road', 'Baner', 'Aundh', 'Hinjawadi', 'Kothrud', 'Wakad', 'Magarpatta'] },
      { name: 'Thane', headquarters: 'Thane', tier: 'tier_1', cities: ['Thane', 'Kalyan', 'Dombivli', 'Ulhasnagar', 'Bhiwandi'], popularLocalities: ['Naupada', 'Ghodbunder Road', 'Hiranandani Estate', 'Panchpakhadi', 'Kalyan West', 'Dombivli East'] },
      { name: 'Nagpur', headquarters: 'Nagpur', tier: 'tier_1', cities: ['Nagpur', 'Kamptee', 'Umred'], popularLocalities: ['Dharampeth', 'Sadar', 'Ramdaspeth', 'Sitabuldi', 'Civil Lines', 'Pratap Nagar', 'Wardha Road'] },
      { name: 'Nashik', headquarters: 'Nashik', tier: 'tier_1', cities: ['Nashik', 'Malegaon', 'Sinnar'], popularLocalities: ['College Road', 'Gangapur Road', 'Indira Nagar', 'Panchavati', 'Mahatma Nagar'] },
      { name: 'Chhatrapati Sambhajinagar', headquarters: 'Chhatrapati Sambhajinagar', tier: 'tier_2', cities: ['Chhatrapati Sambhajinagar', 'Paithan', 'Gangapur'], popularLocalities: ['Cannaught Place', 'Jalna Road', 'Kranti Chowk', 'CIDCO', 'Samarth Nagar'] },
      { name: 'Solapur', headquarters: 'Solapur', tier: 'tier_2', cities: ['Solapur', 'Pandharpur', 'Barshi'], popularLocalities: ['Saat Rasta', 'Old Pune Naka', 'Railway Lines', 'Hotgi Road'] },
      { name: 'Kolhapur', headquarters: 'Kolhapur', tier: 'tier_2', cities: ['Kolhapur', 'Ichalkaranji', 'Jaysingpur'], popularLocalities: ['Rajarampuri', 'Tarabai Park', 'Shahupuri', 'Laxmipuri'] },
      { name: 'Navi Mumbai (Raigad/Thane)', headquarters: 'Navi Mumbai', tier: 'tier_1', cities: ['Navi Mumbai', 'Panvel', 'Kharghar'], popularLocalities: ['Vashi Sector 17', 'Nerul', 'Seawoods', 'Belapur CBD', 'Kharghar Sector 20', 'Panvel Old/New'] },
      { name: 'Amravati', headquarters: 'Amravati', tier: 'tier_2', cities: ['Amravati', 'Achalpur'], popularLocalities: ['Rajkamal Chowk', 'Camp Area', 'Badnera Road'] },
      { name: 'Jalgaon', headquarters: 'Jalgaon', tier: 'tier_2', cities: ['Jalgaon', 'Bhusawal'], popularLocalities: ['Court Road', 'Navi Peth', 'Ring Road'] }
    ]
  },
  {
    code: 'MN',
    name: 'Manipur',
    type: 'state',
    capital: 'Imphal',
    districts: [
      { name: 'Imphal West', headquarters: 'Lamphelpat', tier: 'tier_2', cities: ['Imphal'], popularLocalities: ['Thangal Bazar', 'Paona Bazar', 'Uripok', 'Sagolband'] },
      { name: 'Imphal East', headquarters: 'Porompat', tier: 'tier_2', cities: ['Imphal East', 'Porompat'], popularLocalities: ['New Checkon', 'Lamlong Bazar', 'Palace Compound'] },
      { name: 'Churachandpur', headquarters: 'Churachandpur', tier: 'tier_3', cities: ['Churachandpur'], popularLocalities: ['Tedim Road', 'IB Road', 'New Bazar'] },
      { name: 'Thoubal', headquarters: 'Thoubal', tier: 'tier_3', cities: ['Thoubal', 'Kakching'], popularLocalities: ['Thoubal Bazar', 'Wangjing'] }
    ]
  },
  {
    code: 'ML',
    name: 'Meghalaya',
    type: 'state',
    capital: 'Shillong',
    districts: [
      { name: 'East Khasi Hills', headquarters: 'Shillong', tier: 'tier_1', cities: ['Shillong', 'Sohra (Cherrapunji)'], popularLocalities: ['Police Bazar', 'Laitumkhrah', 'Labar', 'Risa Colony', 'Mawlai'] },
      { name: 'West Garo Hills', headquarters: 'Tura', tier: 'tier_3', cities: ['Tura', 'Tikrikilla'], popularLocalities: ['Tura Bazar', 'Hawakhana', 'Chandmary'] },
      { name: 'Ri-Bhoi', headquarters: 'Nongpoh', tier: 'tier_3', cities: ['Nongpoh', 'Umiam'], popularLocalities: ['GS Road Nongpoh', 'Main Market'] },
      { name: 'West Jaintia Hills', headquarters: 'Jowai', tier: 'tier_3', cities: ['Jowai'], popularLocalities: ['Iawmusiang', 'Ladmukhla'] }
    ]
  },
  {
    code: 'MZ',
    name: 'Mizoram',
    type: 'state',
    capital: 'Aizawl',
    districts: [
      { name: 'Aizawl', headquarters: 'Aizawl', tier: 'tier_2', cities: ['Aizawl'], popularLocalities: ['Bara Bazar', 'Zarkawt', 'Chanmari', 'Khatla', 'Bawngkawn'] },
      { name: 'Lunglei', headquarters: 'Lunglei', tier: 'tier_3', cities: ['Lunglei'], popularLocalities: ['Bazar Veng', 'Venglai', 'Chanmari'] },
      { name: 'Champhai', headquarters: 'Champhai', tier: 'tier_3', cities: ['Champhai'], popularLocalities: ['Kahrawt', 'Vengthlang'] }
    ]
  },
  {
    code: 'NL',
    name: 'Nagaland',
    type: 'state',
    capital: 'Kohima',
    districts: [
      { name: 'Kohima', headquarters: 'Kohima', tier: 'tier_2', cities: ['Kohima'], popularLocalities: ['PR Hill', 'Razhü Point', 'High School Junction', 'Midlane'] },
      { name: 'Dimapur', headquarters: 'Dimapur', tier: 'tier_2', cities: ['Dimapur', 'Chümoukedima'], popularLocalities: ['Nyamo Lotha Road', 'Circular Road', 'Hong Kong Market', 'City Tower'] },
      { name: 'Mokokchung', headquarters: 'Mokokchung', tier: 'tier_3', cities: ['Mokokchung'], popularLocalities: ['Main Market', 'Arkong', 'Artisans Corner'] }
    ]
  },
  {
    code: 'OD',
    name: 'Odisha',
    type: 'state',
    capital: 'Bhubaneswar',
    districts: [
      { name: 'Khordha', headquarters: 'Bhubaneswar', tier: 'tier_1', cities: ['Bhubaneswar', 'Khordha', 'Jatni'], popularLocalities: ['Saheed Nagar', 'Patia', 'Jayadev Vihar', 'Chandrasekharpur', 'Nayapalli', 'Bapuji Nagar', 'Khandagiri'] },
      { name: 'Cuttack', headquarters: 'Cuttack', tier: 'tier_1', cities: ['Cuttack', 'Choudwar'], popularLocalities: ['Badambadi', 'Buxi Bazaar', 'College Square', 'Link Road', 'Cantonment Road'] },
      { name: 'Sundargarh', headquarters: 'Rourkela', tier: 'tier_2', cities: ['Rourkela', 'Sundargarh', 'Rajgangpur'], popularLocalities: ['Civil Township', 'Sector 17', 'Udit Nagar', 'Main Road Rourkela'] },
      { name: 'Puri', headquarters: 'Puri', tier: 'tier_2', cities: ['Puri', 'Konark', 'Pipili'], popularLocalities: ['Grand Road (Bada Danda)', 'VIP Road', 'Chakratirtha Road', 'Sea Beach'] },
      { name: 'Ganjam', headquarters: 'Brahmapur', tier: 'tier_2', cities: ['Brahmapur (Berhampur)', 'Chhatrapur', 'Gopalpur'], popularLocalities: ['Gandhinagar', 'Engineering School Road', 'Bada Bazar'] },
      { name: 'Sambalpur', headquarters: 'Sambalpur', tier: 'tier_2', cities: ['Sambalpur', 'Burla', 'Hirakud'], popularLocalities: ['Budharaja', 'Fathepura', 'Dhanupali', 'Ainthapali'] }
    ]
  },
  {
    code: 'PB',
    name: 'Punjab',
    type: 'state',
    capital: 'Chandigarh',
    districts: [
      { name: 'Ludhiana', headquarters: 'Ludhiana', tier: 'tier_1', cities: ['Ludhiana', 'Khanna', 'Jagraon'], popularLocalities: ['Sarabha Nagar', 'Model Town', 'Ghumar Mandi', 'Ferozepur Road', 'BRS Nagar', 'Civil Lines'] },
      { name: 'Amritsar', headquarters: 'Amritsar', tier: 'tier_1', cities: ['Amritsar', 'Ajnala'], popularLocalities: ['Ranjit Avenue', 'Lawrence Road', 'Mall Road', 'Hall Bazaar', 'Golden Temple Surroundings', 'Majitha Road'] },
      { name: 'Jalandhar', headquarters: 'Jalandhar', tier: 'tier_1', cities: ['Jalandhar', 'Phagwara', 'Nakodar'], popularLocalities: ['Model Town', 'Civil Lines', 'Lajpat Nagar', 'Urban Estate Phase 1-2', 'Cantt Road'] },
      { name: 'SAS Nagar (Mohali)', headquarters: 'Mohali', tier: 'tier_1', cities: ['Mohali', 'Kharar', 'Zirakpur', 'Derabassi'], popularLocalities: ['Phase 3B2', 'Phase 7', 'Phase 5', 'Sector 70', 'VIP Road Zirakpur'] },
      { name: 'Patiala', headquarters: 'Patiala', tier: 'tier_2', cities: ['Patiala', 'Nabha', 'Rajpura'], popularLocalities: ['Leela Bhawan', 'Urban Estate', 'Chhoti Baradari', 'Mall Road Patiala'] },
      { name: 'Bathinda', headquarters: 'Bathinda', tier: 'tier_2', cities: ['Bathinda', 'Rampura Phul'], popularLocalities: ['Mall Road Bathinda', 'Model Town', 'Bhagu Road', 'Civil Lines'] }
    ]
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    type: 'state',
    capital: 'Jaipur',
    districts: [
      { name: 'Jaipur', headquarters: 'Jaipur', tier: 'tier_1', cities: ['Jaipur', 'Chomu', 'Amer', 'Bagru'], popularLocalities: ['C Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Raja Park', 'Mansarovar', 'Tonk Road', 'MI Road', 'Johari Bazaar'] },
      { name: 'Jodhpur', headquarters: 'Jodhpur', tier: 'tier_1', cities: ['Jodhpur', 'Bilara', 'Piparcity'], popularLocalities: ['Sardarpura', 'Shastri Nagar', 'Ratanada', 'Residency Road', 'Clock Tower Bazar'] },
      { name: 'Udaipur', headquarters: 'Udaipur', tier: 'tier_1', cities: ['Udaipur', 'Fatehnagar', 'Salumbar'], popularLocalities: ['Panchwati', 'Fateh Sagar Lake Road', 'Hiran Magri', 'Sukhadia Circle', 'Old City'] },
      { name: 'Kota', headquarters: 'Kota', tier: 'tier_2', cities: ['Kota', 'Ramganj Mandi'], popularLocalities: ['Talwandi', 'Vigyan Nagar', 'Gumanpura', 'Dadabari', 'Rajeev Gandhi Nagar'] },
      { name: 'Bikaner', headquarters: 'Bikaner', tier: 'tier_2', cities: ['Bikaner', 'Nokha'], popularLocalities: ['Kote Gate', 'Rani Bazar', 'Sadul Ganj', 'Pawan Puri'] },
      { name: 'Ajmer', headquarters: 'Ajmer', tier: 'tier_2', cities: ['Ajmer', 'Kishangarh', 'Pushkar'], popularLocalities: ['Ana Sagar Link Road', 'Vaishali Nagar Ajmer', 'Kutchery Road', 'Pushkar Bazaar'] },
      { name: 'Alwar', headquarters: 'Alwar', tier: 'tier_2', cities: ['Alwar', 'Bhiwadi', 'Neemrana'], popularLocalities: ['Bhiwadi Alwar Bypass', 'Moti Doongri', 'Company Bagh'] }
    ]
  },
  {
    code: 'SK',
    name: 'Sikkim',
    type: 'state',
    capital: 'Gangtok',
    districts: [
      { name: 'Gangtok', headquarters: 'Gangtok', tier: 'tier_1', cities: ['Gangtok', 'Singtam', 'Rangpo'], popularLocalities: ['MG Marg Gangtok', 'Tibet Road', 'Deorali', 'Tadong', 'Development Area'] },
      { name: 'Namchi', headquarters: 'Namchi', tier: 'tier_3', cities: ['Namchi', 'Jorethang'], popularLocalities: ['Central Park', 'Char Dham Road'] },
      { name: 'Gyalshing', headquarters: 'Gyalshing', tier: 'tier_3', cities: ['Pelling', 'Gyalshing'], popularLocalities: ['Pelling Upper/Lower', 'Helipad Area'] }
    ]
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    type: 'state',
    capital: 'Chennai',
    districts: [
      { name: 'Chennai', headquarters: 'Chennai', tier: 'tier_1', cities: ['Chennai'], popularLocalities: ['T. Nagar', 'Anna Nagar', 'Adyar', 'Mylapore', 'Nungambakkam', 'Velachery', 'Alwarpet', 'Besant Nagar', 'OMR (Thoraipakkam/Sholinganallur)'] },
      { name: 'Coimbatore', headquarters: 'Coimbatore', tier: 'tier_1', cities: ['Coimbatore', 'Pollachi', 'Mettupalayam'], popularLocalities: ['RS Puram', 'Gandhipuram', 'Saibaba Colony', 'Race Course', 'Peelamedu', 'Avinashi Road'] },
      { name: 'Madurai', headquarters: 'Madurai', tier: 'tier_1', cities: ['Madurai', 'Melur', 'Thirumangalam'], popularLocalities: ['KK Nagar', 'Anna Nagar Madurai', 'Simmakkal', 'Town Hall Road', 'Goripalayam', 'Bypass Road'] },
      { name: 'Tiruchirappalli', headquarters: 'Tiruchirappalli', tier: 'tier_2', cities: ['Tiruchirappalli', 'Thuvakudi', 'Manapparai'], popularLocalities: ['Thillai Nagar', 'Cantonment', 'Srirangam', 'KK Nagar Trichy', 'Main Guard Gate'] },
      { name: 'Salem', headquarters: 'Salem', tier: 'tier_2', cities: ['Salem', 'Attur', 'Mettur'], popularLocalities: ['Fairlands', 'Alagapuram', 'Suramangalam', 'Four Roads'] },
      { name: 'Tirunelveli', headquarters: 'Tirunelveli', tier: 'tier_2', cities: ['Tirunelveli', 'Palayamkottai', 'Ambasamudram'], popularLocalities: ['Vannarpettai', 'Palayamkottai High Grounds', 'Junction Area'] },
      { name: 'Kanchipuram', headquarters: 'Kanchipuram', tier: 'tier_2', cities: ['Kanchipuram', 'Sriperumbudur'], popularLocalities: ['Gandhi Road', 'Ennaikaran', 'SIPCOT Area'] },
      { name: 'Chengalpattu', headquarters: 'Chengalpattu', tier: 'tier_1', cities: ['Tambaram', 'Pallavaram', 'Chengalpattu', 'Mahabalipuram'], popularLocalities: ['GST Road', 'East/West Tambaram', 'Chromepet', 'Mahabalipuram Beach Road'] },
      { name: 'Erode', headquarters: 'Erode', tier: 'tier_2', cities: ['Erode', 'Gobichettipalayam', 'Bhavani'], popularLocalities: ['Perundurai Road', 'Brough Road', 'Mettur Road'] },
      { name: 'Vellore', headquarters: 'Vellore', tier: 'tier_2', cities: ['Vellore', 'Katpadi', 'Gudiyatham'], popularLocalities: ['Gandhi Nagar Katpadi', 'Officer’s Line', 'Arcot Road', 'Sathuvachari'] }
    ]
  },
  {
    code: 'TS',
    name: 'Telangana',
    type: 'state',
    capital: 'Hyderabad',
    districts: [
      { name: 'Hyderabad', headquarters: 'Hyderabad', tier: 'tier_1', cities: ['Hyderabad'], popularLocalities: ['Banjara Hills', 'Jubilee Hills', 'Hitec City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Begumpet', 'Himayatnagar', 'Abids', 'Charminar area'] },
      { name: 'Medchal-Malkajgiri', headquarters: 'Shamirpet', tier: 'tier_1', cities: ['Secunderabad', 'Malkajgiri', 'Kompally', 'Medchal'], popularLocalities: ['Kompally', 'AS Rao Nagar', 'Sainikpuri', 'Kukatpally', 'ECIL Cross Roads'] },
      { name: 'Ranga Reddy', headquarters: 'Shamshabad', tier: 'tier_1', cities: ['Shamshabad', 'Rajendranagar', 'Manikonda', 'Attapur'], popularLocalities: ['Manikonda', 'Narsingi', 'Kokapet', 'Bandlaguda Jagir', 'Airport Road'] },
      { name: 'Warangal', headquarters: 'Warangal', tier: 'tier_2', cities: ['Warangal', 'Hanamkonda', 'Kazipet'], popularLocalities: ['Subedari', 'Nakkalagutta', 'Chowrastha', 'Hunter Road'] },
      { name: 'Nizamabad', headquarters: 'Nizamabad', tier: 'tier_2', cities: ['Nizamabad', 'Bodhan', 'Armoor'], popularLocalities: ['Khaleelwadi', 'Bodhan Road', 'Hyderabad Road'] },
      { name: 'Karimnagar', headquarters: 'Karimnagar', tier: 'tier_2', cities: ['Karimnagar', 'Huzurabad', 'Jagtial'], popularLocalities: ['Collectorate Area', 'Mankammathota', 'Mukarampura'] },
      { name: 'Khammam', headquarters: 'Khammam', tier: 'tier_2', cities: ['Khammam', 'Kothagudem', 'Sathupalli'], popularLocalities: ['Wyra Road', 'Church Compound', 'Mamillagudem'] }
    ]
  },
  {
    code: 'TR',
    name: 'Tripura',
    type: 'state',
    capital: 'Agartala',
    districts: [
      { name: 'West Tripura', headquarters: 'Agartala', tier: 'tier_2', cities: ['Agartala'], popularLocalities: ['Banamalipur', 'Post Office Chowmuhani', 'Akhaura Road', 'Kaman Chowmuhani', 'Battala'] },
      { name: 'Gomati', headquarters: 'Udaipur', tier: 'tier_3', cities: ['Udaipur'], popularLocalities: ['Central Road', 'Matabari'] },
      { name: 'Dharmanagar (North Tripura)', headquarters: 'Dharmanagar', tier: 'tier_3', cities: ['Dharmanagar'], popularLocalities: ['Bajarghat', 'Station Road'] }
    ]
  },
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    type: 'state',
    capital: 'Lucknow',
    districts: [
      { name: 'Lucknow', headquarters: 'Lucknow', tier: 'tier_1', cities: ['Lucknow', 'Malihabad', 'Kakori', 'Mohanlalganj'], popularLocalities: ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Indira Nagar', 'Mahanagar', 'Aminabad', 'Alambagh', 'Chowk'] },
      { name: 'Gautam Buddha Nagar', headquarters: 'Noida', tier: 'tier_1', cities: ['Noida', 'Greater Noida', 'Dadri'], popularLocalities: ['Sector 18', 'Sector 62', 'Sector 15', 'Greater Noida West', 'Knowledge Park', 'Sector 50', 'Sector 137'] },
      { name: 'Varanasi', headquarters: 'Varanasi', tier: 'tier_1', cities: ['Varanasi', 'Ramnagar', 'Pindra'], popularLocalities: ['Godowlia', 'Assi Ghat', 'Lanka', 'Sigra', 'Bhelupur', 'Cantt', 'Sarnath'] },
      { name: 'Kanpur Nagar', headquarters: 'Kanpur', tier: 'tier_1', cities: ['Kanpur', 'Bilhaur', 'Ghatampur'], popularLocalities: ['Civil Lines', 'Swaroop Nagar', 'Kakadeo', 'Govind Nagar', 'Kidwai Nagar', 'Gumti No. 5'] },
      { name: 'Agra', headquarters: 'Agra', tier: 'tier_1', cities: ['Agra', 'Fatehabad', 'Kiraoli'], popularLocalities: ['Tajganj', 'Sanjay Place', 'Civil Lines', 'Fatehabad Road', 'Kamla Nagar', 'Shahganj'] },
      { name: 'Prayagraj', headquarters: 'Prayagraj', tier: 'tier_1', cities: ['Prayagraj', 'Phulpur', 'Koraon'], popularLocalities: ['Civil Lines', 'Katra', 'George Town', 'Tagore Town', 'Kareli', 'Naini'] },
      { name: 'Ghaziabad', headquarters: 'Ghaziabad', tier: 'tier_1', cities: ['Ghaziabad', 'Modinagar', 'Muradnagar'], popularLocalities: ['Indirapuram', 'Vaishali', 'Raj Nagar Extension', 'Vasundhara', 'Crossings Republik', 'Kaushambi'] },
      { name: 'Meerut', headquarters: 'Meerut', tier: 'tier_2', cities: ['Meerut', 'Sardhana', 'Mawana'], popularLocalities: ['Abu Lane', 'Shastri Nagar', 'Modipuram', 'Ganga Nagar', 'Begum Bridge'] },
      { name: 'Bareilly', headquarters: 'Bareilly', tier: 'tier_2', cities: ['Bareilly', 'Aonla', 'Faridpur'], popularLocalities: ['Civil Lines', 'DD Puram', 'Rajendra Nagar', 'Satellite Bus Stand'] },
      { name: 'Aligarh', headquarters: 'Aligarh', tier: 'tier_2', cities: ['Aligarh', 'Khair', 'Atrauli'], popularLocalities: ['Centre Point', 'Civil Lines', 'Marris Road', 'Ramghat Road'] },
      { name: 'Moradabad', headquarters: 'Moradabad', tier: 'tier_2', cities: ['Moradabad', 'Kanth', 'Bilari'], popularLocalities: ['Civil Lines', 'Ram Ganga Vihar', 'Budh Bazaar', 'Delhi Road'] },
      { name: 'Gorakhpur', headquarters: 'Gorakhpur', tier: 'tier_2', cities: ['Gorakhpur', 'Sahjanwa', 'Campierganj'], popularLocalities: ['Golghar', 'Civil Lines', 'Medical College Road', 'Taramandal', 'Betiahata'] },
      { name: 'Saharanpur', headquarters: 'Saharanpur', tier: 'tier_2', cities: ['Saharanpur', 'Deoband', 'Nakur'], popularLocalities: ['Court Road', 'Mission Compound', 'Delhi Road', 'Chilkana Road'] },
      { name: 'Jhansi', headquarters: 'Jhansi', tier: 'tier_2', cities: ['Jhansi', 'Mauranipur', 'Moth'], popularLocalities: ['Sadar Bazaar', 'Elite Crossing', 'Civil Lines', 'Sipri Bazaar'] },
      { name: 'Ayodhya', headquarters: 'Ayodhya', tier: 'tier_2', cities: ['Ayodhya', 'Faizabad'], popularLocalities: ['Rampath', 'Civil Lines Faizabad', 'Naya Ghat', 'Rekabganj', 'Devkali'] },
      { name: 'Mathura', headquarters: 'Mathura', tier: 'tier_2', cities: ['Mathura', 'Vrindavan', 'Govardhan'], popularLocalities: ['Vrindavan Parikrama Marg', 'Dampier Nagar', 'Krishna Nagar', 'Holi Gate'] },
      { name: 'Muzaffarnagar', headquarters: 'Muzaffarnagar', tier: 'tier_2', cities: ['Muzaffarnagar', 'Khatauli', 'Budhana'], popularLocalities: ['New Mandi', 'Roorkee Road', 'Shiv Chowk'] }
    ]
  },
  {
    code: 'UK',
    name: 'Uttarakhand',
    type: 'state',
    capital: 'Dehradun',
    districts: [
      { name: 'Dehradun', headquarters: 'Dehradun', tier: 'tier_1', cities: ['Dehradun', 'Rishikesh', 'Mussoorie', 'Vikasnagar'], popularLocalities: ['Rajpur Road', 'Jakhan', 'Ballupur', 'Paltan Bazaar', 'Mall Road Mussoorie', 'Tapovan Rishikesh'] },
      { name: 'Haridwar', headquarters: 'Haridwar', tier: 'tier_1', cities: ['Haridwar', 'Roorkee', 'Laksar'], popularLocalities: ['Har Ki Pauri', 'Ranipur More', 'Civil Lines Roorkee', 'Shivalik Nagar', 'Jwalapur'] },
      { name: 'Nainital', headquarters: 'Nainital', tier: 'tier_1', cities: ['Nainital', 'Haldwani', 'Ramnagar (Corbett)'], popularLocalities: ['Mall Road Nainital', 'Kaladhungi Road Haldwani', 'Tikonia Haldwani', 'Mukhani'] },
      { name: 'Udham Singh Nagar', headquarters: 'Rudrapur', tier: 'tier_2', cities: ['Rudrapur', 'Kashipur', 'Kichha'], popularLocalities: ['Kashipur Road', 'Awas Vikas', 'Bazpur Road'] },
      { name: 'Almora', headquarters: 'Almora', tier: 'tier_3', cities: ['Almora', 'Ranikhet'], popularLocalities: ['Mall Road Almora', 'Lala Bazaar', 'The Mall Ranikhet'] },
      { name: 'Pauri Garhwal', headquarters: 'Pauri', tier: 'tier_3', cities: ['Kotdwar', 'Pauri', 'Srinagar'], popularLocalities: ['Najibabad Road Kotdwar', 'Main Market Srinagar'] }
    ]
  },
  {
    code: 'WB',
    name: 'West Bengal',
    type: 'state',
    capital: 'Kolkata',
    districts: [
      { name: 'Kolkata', headquarters: 'Kolkata', tier: 'tier_1', cities: ['Kolkata'], popularLocalities: ['Park Street', 'Salt Lake (Bidhannagar)', 'New Town', 'Ballygunge', 'Alipore', 'Gariahat', 'Esplanade', 'Behala', 'Shyambazar', 'Camac Street'] },
      { name: 'North 24 Parganas', headquarters: 'Barasat', tier: 'tier_1', cities: ['Barasat', 'Barrackpore', 'Dum Dum', 'Habra'], popularLocalities: ['Jessore Road', 'Dum Dum Cantonment', 'SN Banerjee Road Barrackpore'] },
      { name: 'South 24 Parganas', headquarters: 'Alipore', tier: 'tier_1', cities: ['Baruipur', 'Sonarpur', 'Diamond Harbour'], popularLocalities: ['Garia Main Road', 'Sonarpur Station Road', 'Baruipur Bypass'] },
      { name: 'Howrah', headquarters: 'Howrah', tier: 'tier_1', cities: ['Howrah', 'Uluberia', 'Bally'], popularLocalities: ['Shibpur', 'Mandirtala', 'Salkia', 'G T Road Howrah', 'Kadamtala'] },
      { name: 'Paschim Bardhaman', headquarters: 'Asansol', tier: 'tier_2', cities: ['Asansol', 'Durgapur', 'Raniganj'], popularLocalities: ['City Centre Durgapur', 'Benachity', 'Hutton Road Asansol', 'Burnpur'] },
      { name: 'Darjeeling', headquarters: 'Darjeeling', tier: 'tier_1', cities: ['Darjeeling', 'Siliguri', 'Kurseong', 'Mirik'], popularLocalities: ['The Mall Darjeeling', 'Chowrasta', 'Sevoke Road Siliguri', 'Hill Cart Road Siliguri', 'Pradhan Nagar Siliguri'] },
      { name: 'Hooghly', headquarters: 'Chinsurah', tier: 'tier_2', cities: ['Serampore', 'Chandannagar', 'Chinsurah', 'Uttarpara'], popularLocalities: ['Strand Road Chandannagar', 'GT Road Serampore', 'Kotrung'] },
      { name: 'Purba Medinipur', headquarters: 'Tamluk', tier: 'tier_2', cities: ['Haldia', 'Digha', 'Tamluk', 'Contai'], popularLocalities: ['Digha Sea Beach Road', 'City Centre Haldia', 'Durgachak'] },
      { name: 'Nadia', headquarters: 'Krishnanagar', tier: 'tier_2', cities: ['Kalyani', 'Krishnanagar', 'Ranaghat', 'Nabadwip'], popularLocalities: ['Central Park Kalyani', 'High Street Krishnanagar', 'Station Road'] }
    ]
  },

  // --- 8 UNION TERRITORIES ---
  {
    code: 'AN',
    name: 'Andaman and Nicobar Islands',
    type: 'union_territory',
    capital: 'Port Blair',
    districts: [
      { name: 'South Andaman', headquarters: 'Port Blair', tier: 'tier_2', cities: ['Port Blair', 'Havelock (Swaraj Dweep)', 'Neil (Shaheed Dweep)'], popularLocalities: ['Aberdeen Bazaar', 'Middle Point', 'Marina Park Area', 'Havelock Beach #5', 'Dollygunj'] },
      { name: 'North and Middle Andaman', headquarters: 'Mayabunder', tier: 'tier_3', cities: ['Mayabunder', 'Diglipur', 'Rangat'], popularLocalities: ['Main Market', 'Bazar Line'] },
      { name: 'Nicobar', headquarters: 'Car Nicobar', tier: 'tier_3', cities: ['Car Nicobar'], popularLocalities: ['Headquarters Area'] }
    ]
  },
  {
    code: 'CH',
    name: 'Chandigarh',
    type: 'union_territory',
    capital: 'Chandigarh',
    districts: [
      { name: 'Chandigarh', headquarters: 'Chandigarh', tier: 'tier_1', cities: ['Chandigarh'], popularLocalities: ['Sector 17 Plaza', 'Sector 35 Inner Market', 'Sector 26 Madhya Marg', 'Sector 8 Inner Market', 'Sector 22 Shastri Market', 'Sector 9', 'Elante Mall Industrial Area'] }
    ]
  },
  {
    code: 'DH',
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'union_territory',
    capital: 'Daman',
    districts: [
      { name: 'Daman', headquarters: 'Daman', tier: 'tier_2', cities: ['Daman'], popularLocalities: ['Nani Daman', 'Moti Daman', 'Devka Beach Road'] },
      { name: 'Diu', headquarters: 'Diu', tier: 'tier_2', cities: ['Diu'], popularLocalities: ['Nagoa Beach', 'Main Bunder Road'] },
      { name: 'Dadra and Nagar Haveli', headquarters: 'Silvassa', tier: 'tier_2', cities: ['Silvassa'], popularLocalities: ['Kilwani Road', 'Sayli Road', 'Dokmardi'] }
    ]
  },
  {
    code: 'DL',
    name: 'Delhi',
    type: 'union_territory',
    capital: 'New Delhi',
    districts: [
      { name: 'New Delhi', headquarters: 'Connaught Place', tier: 'tier_1', cities: ['New Delhi'], popularLocalities: ['Connaught Place', 'Khan Market', 'Barakhamba Road', 'Janpath', 'Chanakyapuri', 'Gol Market'] },
      { name: 'Central Delhi', headquarters: 'Daryaganj', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Karol Bagh', 'Daryaganj', 'Paharganj', 'Rajinder Nagar', 'Chandni Chowk'] },
      { name: 'South Delhi', headquarters: 'Saket', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Hauz Khas Village', 'Greater Kailash (GK 1 & 2)', 'Saket', 'Defence Colony', 'South Extension', 'Green Park'] },
      { name: 'South East Delhi', headquarters: 'Defence Colony', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Lajpat Nagar (Central Market)', 'New Friends Colony', 'Kalkaji', 'Nehru Place', 'Okhla'] },
      { name: 'South West Delhi', headquarters: 'Vasant Vihar', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Dwarka (Sector 6, 10, 12, 21)', 'Vasant Kunj', 'Vasant Vihar', 'Aerocity'] },
      { name: 'West Delhi', headquarters: 'Rajouri Garden', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Rajouri Garden', 'Punjabi Bagh', 'Janakpuri District Centre', 'Tilak Nagar', 'Paschim Vihar'] },
      { name: 'North Delhi', headquarters: 'Civil Lines', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Civil Lines', 'Kamla Nagar', 'Model Town', 'Hudson Lane (GTB Nagar)', 'Ashok Vihar'] },
      { name: 'North West Delhi', headquarters: 'Kanjhawala', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Rohini (Sector 7, 9, 13, 14)', 'Pitampura (Netaji Subhash Place)', 'Shalimar Bagh'] },
      { name: 'East Delhi', headquarters: 'Preet Vihar', tier: 'tier_1', cities: ['Delhi'], popularLocalities: ['Preet Vihar', 'Laxmi Nagar', 'Mayur Vihar Phase 1-2', 'Vikas Marg', 'Karkardooma'] },
      { name: 'Shahdara', headquarters: 'Shahdara', tier: 'tier_2', cities: ['Delhi'], popularLocalities: ['Dilshad Garden', 'Shahdara Market', 'Vivek Vihar', 'Jhilmil Colony'] },
      { name: 'North East Delhi', headquarters: 'Nand Nagri', tier: 'tier_2', cities: ['Delhi'], popularLocalities: ['Yamuna Vihar', 'Seelampur', 'Bhajanpura'] }
    ]
  },
  {
    code: 'JK',
    name: 'Jammu and Kashmir',
    type: 'union_territory',
    capital: 'Srinagar / Jammu',
    districts: [
      { name: 'Srinagar', headquarters: 'Srinagar', tier: 'tier_1', cities: ['Srinagar'], popularLocalities: ['Lal Chowk', 'Dal Gate', 'Residency Road', 'Rajbagh', 'Karan Nagar', 'Boulevard Road'] },
      { name: 'Jammu', headquarters: 'Jammu', tier: 'tier_1', cities: ['Jammu', 'Akhnoor'], popularLocalities: ['Gandhi Nagar', 'Bahu Plaza', 'Resham Ghar', 'Raghunath Bazar', 'Channi Himmat'] },
      { name: 'Anantnag', headquarters: 'Anantnag', tier: 'tier_2', cities: ['Anantnag', 'Pahalgam'], popularLocalities: ['KP Road', 'Mehandi Kadal', 'Pahalgam Club Road'] },
      { name: 'Baramulla', headquarters: 'Baramulla', tier: 'tier_2', cities: ['Baramulla', 'Gulmarg', 'Sopore'], popularLocalities: ['Main Market Baramulla', 'Gulmarg Market Area'] },
      { name: 'Udhampur', headquarters: 'Udhampur', tier: 'tier_2', cities: ['Udhampur', 'Ramnagar'], popularLocalities: ['Dhar Road', 'Mukherjee Bazar'] },
      { name: 'Katara (Reasi)', headquarters: 'Reasi', tier: 'tier_2', cities: ['Katra'], popularLocalities: ['Katra Main Bazar', 'Jammu Road Katra'] }
    ]
  },
  {
    code: 'LA',
    name: 'Ladakh',
    type: 'union_territory',
    capital: 'Leh',
    districts: [
      { name: 'Leh', headquarters: 'Leh', tier: 'tier_2', cities: ['Leh', 'Nubra'], popularLocalities: ['Main Bazaar Leh', 'Changspa Road', 'Fort Road', 'Old Town Leh'] },
      { name: 'Kargil', headquarters: 'Kargil', tier: 'tier_3', cities: ['Kargil', 'Drass', 'Zanskar'], popularLocalities: ['Main Market Kargil', 'Baroo'] }
    ]
  },
  {
    code: 'LD',
    name: 'Lakshadweep',
    type: 'union_territory',
    capital: 'Kavaratti',
    districts: [
      { name: 'Lakshadweep', headquarters: 'Kavaratti', tier: 'tier_3', cities: ['Kavaratti', 'Agatti', 'Amini', 'Andrott'], popularLocalities: ['Main Jetty Road', 'Island Market'] }
    ]
  },
  {
    code: 'PY',
    name: 'Puducherry',
    type: 'union_territory',
    capital: 'Puducherry',
    districts: [
      { name: 'Puducherry', headquarters: 'Puducherry', tier: 'tier_1', cities: ['Puducherry', 'Auroville area'], popularLocalities: ['White Town (French Quarter)', 'Heritage Town', 'Mission Street', 'Goubert Avenue (Beach Road)', 'Auroville Main Road'] },
      { name: 'Karaikal', headquarters: 'Karaikal', tier: 'tier_3', cities: ['Karaikal'], popularLocalities: ['Church Street', 'Bharathiyar Street'] },
      { name: 'Mahe', headquarters: 'Mahe', tier: 'tier_3', cities: ['Mahe'], popularLocalities: ['Walkway Area', 'Main Road'] },
      { name: 'Yanam', headquarters: 'Yanam', tier: 'tier_3', cities: ['Yanam'], popularLocalities: ['Pillar Gate Road', 'Ferry Road'] }
    ]
  }
];

// In-memory registry of dynamic / custom added localities
const customLocationsRegistry: GeographicLocation[] = [];

/**
 * Returns all 36 Indian administrative entities (28 States + 8 Union Territories)
 */
export function getAllIndianStatesAndUTs(): StateOrUT[] {
  return INDIAN_STATES_AND_UTS;
}

/**
 * Normalized list of GeographicLocation objects representing the complete India registry
 */
export function getNormalizedIndiaLocations(): GeographicLocation[] {
  const locations: GeographicLocation[] = [];

  for (const item of INDIAN_STATES_AND_UTS) {
    const stateId = `in-${item.code.toLowerCase()}`;

    // Root State / UT
    locations.push({
      id: stateId,
      parent_id: null,
      country_code: 'IN',
      state: item.name,
      district: item.name,
      geographic_type: 'state',
      supported_status: 'active',
      metadata: { code: item.code, type: item.type, capital: item.capital }
    });

    for (const dist of item.districts) {
      const distSlug = dist.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const districtId = `${stateId}-${distSlug}`;

      locations.push({
        id: districtId,
        parent_id: stateId,
        country_code: 'IN',
        state: item.name,
        district: dist.name,
        city: dist.headquarters,
        geographic_type: 'district',
        supported_status: 'active',
        metadata: { tier: dist.tier, headquarters: dist.headquarters, cities: dist.cities }
      });

      // Cities within District
      for (const city of dist.cities) {
        if (city !== dist.headquarters) {
          const citySlug = city.toLowerCase().replace(/[^a-z0-9]/g, '-');
          locations.push({
            id: `${districtId}-city-${citySlug}`,
            parent_id: districtId,
            country_code: 'IN',
            state: item.name,
            district: dist.name,
            city: city,
            geographic_type: 'city',
            supported_status: 'active'
          });
        }
      }

      // Localities within District
      for (const loc of dist.popularLocalities) {
        const locSlug = loc.toLowerCase().replace(/[^a-z0-9]/g, '-');
        locations.push({
          id: `${districtId}-loc-${locSlug}`,
          parent_id: districtId,
          country_code: 'IN',
          state: item.name,
          district: dist.name,
          city: dist.headquarters,
          locality: loc,
          geographic_type: 'locality',
          supported_status: 'active'
        });
      }
    }
  }

  // Include user-defined custom localities
  locations.push(...customLocationsRegistry);

  return locations;
}

/**
 * Adds a new user-specified locality at runtime when not present in standard dataset
 */
export function addCustomLocality(
  stateName: string,
  districtName: string,
  cityName: string,
  localityName: string
): GeographicLocation {
  const cleanState = stateName.trim();
  const cleanDistrict = districtName.trim();
  const cleanCity = cityName.trim() || cleanDistrict;
  const cleanLocality = localityName.trim();

  const stateSlug = cleanState.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const distSlug = cleanDistrict.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const locSlug = cleanLocality.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const districtId = `in-${stateSlug}-${distSlug}`;
  const id = `${districtId}-custom-${locSlug}-${Date.now().toString(36)}`;

  const newLoc: GeographicLocation = {
    id,
    parent_id: districtId,
    country_code: 'IN',
    state: cleanState,
    district: cleanDistrict,
    city: cleanCity,
    locality: cleanLocality,
    geographic_type: 'locality',
    supported_status: 'active',
    metadata: { is_custom: true, created_at: new Date().toISOString() }
  };

  customLocationsRegistry.push(newLoc);
  return newLoc;
}

/**
 * Search locations by name, district, or state
 */
export function searchIndianLocations(query: string): GeographicLocation[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const all = getNormalizedIndiaLocations();
  return all.filter(l =>
    l.state.toLowerCase().includes(q) ||
    l.district.toLowerCase().includes(q) ||
    (l.city && l.city.toLowerCase().includes(q)) ||
    (l.locality && l.locality.toLowerCase().includes(q))
  );
}

/**
 * Find location by its unique ID
 */
export function findLocationById(id: string): GeographicLocation | undefined {
  const all = getNormalizedIndiaLocations();
  const found = all.find(l => l.id === id);
  if (found) return found;

  const normId = id.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const relaxed = all.find(l => {
    const locNorm = l.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (locNorm === normId) return true;
    if (l.locality && l.district) {
      const slug = `${l.district}-${l.locality}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (slug === normId) return true;
    }
    if (l.city && l.district) {
      const slug = `${l.district}-${l.city}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (slug === normId) return true;
    }
    return false;
  });
  if (relaxed) return relaxed;

  // Resolve city IDs generated by getDistrictCitiesAndTowns:
  // e.g. city-uttar-pradesh-lucknow-malihabad
  if (id.startsWith('city-')) {
    const city = findVerifiedCityById(id);
    if (city) {
      return {
        id: city.id,
        parent_id: null,
        country_code: 'IN',
        state: city.state,
        district: city.district,
        city: city.name,
        geographic_type: 'city',
        supported_status: 'active',
        latitude: city.latitude ?? null,
        longitude: city.longitude ?? null,
      };
    }
  }

  return undefined;
}

/**
 * Validates whether a given location ID or city ID belongs strictly to the target district and state.
 */
export function isLocationInDistrict(locationId: string, stateName: string, districtName: string): boolean {
  const normState = stateName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normDist = districtName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normLoc = locationId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (locationId.startsWith('city-')) {
    const city = findVerifiedCityById(locationId);
    if (city) {
      const cityDistSlug = city.district.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const cityStateSlug = city.state.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return (
        cityDistSlug === normDist &&
        (cityStateSlug === normState || normState.includes(cityStateSlug) || cityStateSlug.includes(normState))
      );
    }
    // Token-based fallback check if ID matches city-<state>-<district>-<place>
    return (
      (normLoc.includes(`-${normDist}-`) || normLoc.endsWith(`-${normDist}`)) &&
      (normLoc.includes(`-${normState}-`) || normLoc.includes(normState))
    );
  }

  const loc = findLocationById(locationId);
  if (loc) {
    const locDist = (loc.district || loc.city || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const locState = (loc.state || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return (
      locDist === normDist &&
      (locState === normState || normState.includes(locState) || locState.includes(normState))
    );
  }

  // Fallback slug check: e.g. "lucknow-hazratganj" or "kargil-central"
  return normLoc.startsWith(normDist) || normLoc.includes(`-${normDist}-`) || normLoc.endsWith(`-${normDist}`);
}

/**
 * Find a verified city or town by its generated ID across all states/districts
 */
export function findVerifiedCityById(id: string): VerifiedCityInfo | undefined {
  const normInputId = id.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // 1. Fast match: locate matching state and district from slug tokens
  for (const state of INDIAN_STATES_AND_UTS) {
    const stateSlug = state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const stateCode = state.code.toLowerCase();
    if (normInputId.includes(stateSlug) || normInputId.includes(stateCode)) {
      for (const dist of state.districts) {
        const distSlug = dist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (normInputId.includes(distSlug)) {
          const hierarchy = getDistrictCitiesAndTowns(state.name, dist.name);
          const match = hierarchy.cities.find(c => {
            const normCId = c.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            return normCId === normInputId || c.id === id;
          });
          if (match) return match;
        }
      }
    }
  }

  // 2. Full scan across states/districts as fallback
  for (const state of INDIAN_STATES_AND_UTS) {
    for (const dist of state.districts) {
      const hierarchy = getDistrictCitiesAndTowns(state.name, dist.name);
      const match = hierarchy.cities.find(c => {
        const normCId = c.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return normCId === normInputId || c.id === id;
      });
      if (match) return match;
    }
  }
  return undefined;
}

export interface VerifiedCityInfo {
  id: string;
  name: string;
  district: string;
  state: string;
  isHeadquarters: boolean;
  searchCells: string[];
  localities: string[];
  hasCoverageGap?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// Centroid coordinates for authentic geographic bounding and Overpass searches
export const DISTRICT_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Ladakh & J&K
  'kargil': { lat: 34.5539, lng: 76.1349 },
  'drass': { lat: 34.4294, lng: 75.7617 },
  'zanskar': { lat: 33.4912, lng: 76.8797 },
  'leh': { lat: 34.1526, lng: 77.5771 },
  'nubra': { lat: 34.6863, lng: 77.5673 },
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'jammu': { lat: 32.7266, lng: 74.8570 },
  // Uttar Pradesh
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'gosainganj': { lat: 26.7725, lng: 81.1197 },
  'malihabad': { lat: 26.9213, lng: 80.7107 },
  'kakori': { lat: 26.8732, lng: 80.7981 },
  'mohanlalganj': { lat: 26.6713, lng: 80.9839 },
  'bakshi ka talab': { lat: 26.9749, lng: 80.8974 },
  'itaunja': { lat: 27.0833, lng: 80.9167 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'kanpur nagar': { lat: 26.4499, lng: 80.3319 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'gautam buddha nagar': { lat: 28.5355, lng: 77.3910 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'greater noida': { lat: 28.4744, lng: 77.5040 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'prayagraj': { lat: 25.4358, lng: 81.8463 },
  'meerut': { lat: 28.9845, lng: 77.7064 },
  'bareilly': { lat: 28.3670, lng: 79.4304 },
  'aligarh': { lat: 27.8974, lng: 78.0880 },
  'moradabad': { lat: 28.8386, lng: 78.7733 },
  'gorakhpur': { lat: 26.7606, lng: 83.3732 },
  'ayodhya': { lat: 26.7922, lng: 82.1998 },
  'jhansi': { lat: 25.4484, lng: 78.5685 },
  'mathura': { lat: 27.4924, lng: 77.6737 },
  // Key Metros & States
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'bengaluru urban': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'shimla': { lat: 31.1048, lng: 77.1734 },
  // Uttarakhand
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'rishikesh': { lat: 30.0869, lng: 78.2676 },
  'mussoorie': { lat: 30.4598, lng: 78.0644 },
  'haridwar': { lat: 29.9457, lng: 78.1642 },
  'roorkee': { lat: 29.8543, lng: 77.8880 },
  'nainital': { lat: 29.3919, lng: 79.4542 },
  'haldwani': { lat: 29.2183, lng: 79.5130 },
  'ramnagar': { lat: 29.3956, lng: 79.1278 },
  'almora': { lat: 29.5971, lng: 79.6591 },
  'ranikhet': { lat: 29.6434, lng: 79.4322 },
  'rudrapur': { lat: 28.9800, lng: 79.4000 },
  'kashipur': { lat: 29.2105, lng: 78.9619 },
  'pauri': { lat: 30.1477, lng: 78.7806 },
  'kotdwar': { lat: 29.7464, lng: 78.5286 },
  'srinagar garhwal': { lat: 30.2223, lng: 78.7836 },
  'puducherry': { lat: 11.9416, lng: 79.8083 },
  'north goa': { lat: 15.5398, lng: 73.8188 },
  'south goa': { lat: 15.2832, lng: 73.9862 },
};

// Well-known verified tehsils, municipalities, and towns for key districts
const DISTRICT_TOWNS_REGISTRY: Record<string, string[]> = {
  'lucknow': ['Lucknow', 'Malihabad', 'Kakori', 'Mohanlalganj', 'Bakshi Ka Talab', 'Gosainganj', 'Itaunja'],
  'gautam buddha nagar': ['Noida', 'Greater Noida', 'Dadri', 'Jewar', 'Dankaur', 'Rabupura'],
  'kanpur nagar': ['Kanpur', 'Bilhaur', 'Ghatampur', 'Bithoor', 'Shivrajpur'],
  'agra': ['Agra', 'Fatehabad', 'Etmadpur', 'Kheragarh', 'Bah', 'Shamsabad'],
  'varanasi': ['Varanasi', 'Ramnagar', 'Pindra', 'Rohaniya', 'Sarnath'],
  'prayagraj': ['Prayagraj', 'Phulpur', 'Handia', 'Koraon', 'Soraon', 'Bara'],
  'ghaziabad': ['Ghaziabad', 'Modinagar', 'Muradnagar', 'Loni'],
  'meerut': ['Meerut', 'Mawana', 'Sardhana', 'Hastinapur'],
  'bareilly': ['Bareilly', 'Aonla', 'Baheri', 'Faridpur', 'Nawabganj'],
  'aligarh': ['Aligarh', 'Atrauli', 'Khair', 'Gabhana', 'Iglas'],
  'moradabad': ['Moradabad', 'Bilari', 'Kanth', 'Thakurdwara'],
  'gorakhpur': ['Gorakhpur', 'Sahjanwa', 'Bansgaon', 'Campierganj', 'Pipraich'],
  'ayodhya': ['Ayodhya', 'Faizabad', 'Rudauli', 'Bikapur', 'Milkipur'],
  'jhansi': ['Jhansi', 'Mauranipur', 'Garautha', 'Moth', 'Babina'],
  'mathura': ['Mathura', 'Vrindavan', 'Goverdhan', 'Chhata', 'Mant'],
  'mumbai': ['Mumbai', 'Bandra', 'Andheri', 'Borivali', 'Dadar', 'Kurla', 'Colaba'],
  'pune': ['Pune', 'Pimpri-Chinchwad', 'Baramati', 'Talegaon', 'Shirur', 'Lonavala'],
  'bengaluru urban': ['Bengaluru', 'Yelahanka', 'Kengeri', 'Anekal', 'Whitefield', 'Electronic City'],
  'jaipur': ['Jaipur', 'Chomu', 'Amer', 'Sanganer', 'Kotputli', 'Bassi'],
  'hyderabad': ['Hyderabad', 'Secunderabad', 'Charminar', 'Madhapur', 'Gachibowli', 'Kukatpally'],
};

/**
 * Loads all verified major cities, towns, municipalities and relevant populated places
 * within a selected district. Ensures a district is never assumed to contain only one city.
 */
export function getDistrictCitiesAndTowns(stateName: string, districtName: string): {
  district: string;
  state: string;
  headquarters: string;
  cities: VerifiedCityInfo[];
  coverageGapReported: boolean;
  coverageGapNotes?: string;
} {
  const normState = stateName.trim().toLowerCase();
  const normDist = districtName.trim().toLowerCase();

  const stateObj = INDIAN_STATES_AND_UTS.find(
    s => s.name.toLowerCase() === normState || s.code.toLowerCase() === normState
  );

  const distObj = stateObj?.districts.find(
    d => d.name.toLowerCase() === normDist || d.headquarters.toLowerCase() === normDist
  );

  const cleanState = stateObj?.name || stateName.trim();
  const cleanDist = distObj?.name || districtName.trim();
  const cleanHq = distObj?.headquarters || cleanDist;

  // Gather verified places from District Meta and Towns Registry
  const placeNamesSet = new Set<string>();

  // 1. Headquarters
  placeNamesSet.add(cleanHq);

  // 2. Cities in district definition
  if (distObj?.cities && distObj.cities.length > 0) {
    for (const c of distObj.cities) {
      if (c && c.trim()) placeNamesSet.add(c.trim());
    }
  }

  // 3. Towns in Registry
  const knownTowns = DISTRICT_TOWNS_REGISTRY[normDist];
  if (knownTowns) {
    for (const t of knownTowns) {
      if (t && t.trim()) placeNamesSet.add(t.trim());
    }
  }

  // Check if place data is limited
  let coverageGapReported = false;
  let coverageGapNotes: string | undefined;

  if (placeNamesSet.size <= 1) {
    coverageGapReported = true;
    coverageGapNotes = `Geographic boundary notice: Only administrative headquarters (${cleanHq}) is currently cataloged in base dataset. Sub-divisional places will be dynamically resolved during discovery.`;
  }

  const cities: VerifiedCityInfo[] = Array.from(placeNamesSet).map((placeName, idx) => {
    const isHq = placeName.toLowerCase() === cleanHq.toLowerCase();
    const stateSlug = cleanState.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const distSlug = cleanDist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const placeSlug = placeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cityId = `city-${stateSlug}-${distSlug}-${placeSlug}`;

    // Subdivide city search area into manageable cells (e.g. Center cell + Popular Localities)
    const subLocalities = isHq && distObj?.popularLocalities ? distObj.popularLocalities : [];
    const searchCells = [
      `${placeName} Central (${cleanDist})`,
      ...subLocalities.slice(0, 4).map(loc => `${loc}, ${placeName}`),
    ];

    const centroid =
      DISTRICT_CENTROIDS[placeName.toLowerCase().trim()] ||
      DISTRICT_CENTROIDS[cleanDist.toLowerCase().trim()] ||
      DISTRICT_CENTROIDS[cleanHq.toLowerCase().trim()];

    return {
      id: cityId,
      name: placeName,
      district: cleanDist,
      state: cleanState,
      isHeadquarters: isHq,
      searchCells,
      localities: subLocalities,
      latitude: centroid ? centroid.lat : null,
      longitude: centroid ? centroid.lng : null,
    };
  });

  return {
    district: cleanDist,
    state: cleanState,
    headquarters: cleanHq,
    cities,
    coverageGapReported,
    coverageGapNotes,
  };
}
