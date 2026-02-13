/**
 * Password strength validator and indicator component
 */

export const validatePassword = (password) => {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;

    let strength = 'weak';
    if (metRequirements >= 5) strength = 'strong';
    else if (metRequirements >= 3) strength = 'medium';

    return { requirements, strength, isValid: metRequirements === 5 };
};

export default function PasswordStrength({ password, showRequirements = true }) {
    if (!password) return null;

    const { requirements, strength } = validatePassword(password);

    const strengthColors = {
        weak: '#EF4444',
        medium: '#F59E0B',
        strong: '#10B981',
    };

    const strengthWidth = {
        weak: '33%',
        medium: '66%',
        strong: '100%',
    };

    return (
        <div className="password-strength">
            {/* Strength Bar */}
            <div className="password-strength__bar">
                <div
                    className="password-strength__fill"
                    style={{
                        width: strengthWidth[strength],
                        backgroundColor: strengthColors[strength],
                    }}
                />
            </div>
            <p className="password-strength__label" style={{ color: strengthColors[strength] }}>
                {strength === 'weak' && 'Weak password'}
                {strength === 'medium' && 'Medium password'}
                {strength === 'strong' && 'Strong password'}
            </p>

            {/* Requirements Checklist */}
            {showRequirements && (
                <ul className="password-requirements">
                    <li className={requirements.minLength ? 'requirement--met' : ''}>
                        {requirements.minLength ? '✓' : '○'} At least 8 characters
                    </li>
                    <li className={requirements.hasUppercase ? 'requirement--met' : ''}>
                        {requirements.hasUppercase ? '✓' : '○'} One uppercase letter
                    </li>
                    <li className={requirements.hasLowercase ? 'requirement--met' : ''}>
                        {requirements.hasLowercase ? '✓' : '○'} One lowercase letter
                    </li>
                    <li className={requirements.hasNumber ? 'requirement--met' : ''}>
                        {requirements.hasNumber ? '✓' : '○'} One number
                    </li>
                    <li className={requirements.hasSpecial ? 'requirement--met' : ''}>
                        {requirements.hasSpecial ? '✓' : '○'} One special character (!@#$%^&*)
                    </li>
                </ul>
            )}
        </div>
    );
}
