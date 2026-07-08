import brandMarkIllustration from '../assets/illustrations/brand-mark.png';

const BrandMark = ({ className = 'w-11 h-11' }) => {
  return (
    <div className={`${className} rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm`}>
      <img 
        src={brandMarkIllustration} 
        alt="SecureVote Brand Logo" 
        className="w-full h-full object-cover mix-blend-multiply"
        loading="eager"
      />
    </div>
  );
};

export default BrandMark;
