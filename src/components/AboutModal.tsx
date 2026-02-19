interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="about-modal" onClick={e => e.stopPropagation()}>
                <div className="about-header">
                    <h2>About Yoro</h2>
                    <button className="about-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="about-content">
                    <p className="about-tagline">
                        Made with <span className="heart-icon">❤️</span> by{' '}
                        <a href="https://gabrielongzm.com" target="_blank" rel="noopener noreferrer">
                            Gabriel Ong
                        </a>
                    </p>
                    <p className="about-source">
                        Source code{' '}
                        <a href="https://github.com/gongahkia/yoro" target="_blank" rel="noopener noreferrer">
                            here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};
