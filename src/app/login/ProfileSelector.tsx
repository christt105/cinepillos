"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

export function ProfileSelector({ users }: { users: User[] }) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    const handleProfileClick = (user: User) => {
        setSelectedUser(user);
        setPin("");
        setError(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const res = await signIn("credentials", {
                email: selectedUser.email,
                password: pin, // Assuming PIN is mapped to password field for now
                redirect: true,
                callbackUrl: "/",
            });

            if (res?.error) {
                setError(true);
            }
        } catch (err) {
            console.error(err);
            setError(true);
        }
    };

    if (selectedUser) {
        return (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '0.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <Image
                        src={selectedUser.image || "https://via.placeholder.com/150"}
                        alt={selectedUser.name || "User"}
                        width={100}
                        height={100}
                        style={{ borderRadius: '4px' }}
                        unoptimized
                    />
                    <h2 style={{ marginTop: '1rem' }}>{selectedUser.name}</h2>
                </div>

                <form onSubmit={handleLogin}>
                    <p style={{ marginBottom: '0.5rem', opacity: 0.8 }}>Enter Profile PIN (Default: 1234)</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <input
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            autoFocus
                            style={{
                                background: '#333',
                                border: error ? '1px solid red' : '1px solid #555',
                                padding: '0.75rem',
                                color: 'white',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                width: '150px',
                                letterSpacing: '0.5rem'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}>Enter</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Back</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '2vw', maxWidth: '1000px', width: '100%', justifyContent: 'center' }}>
            {users.map((user) => (
                <div
                    key={user.id}
                    onClick={() => handleProfileClick(user)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                    className="profile-item"
                >
                    <div style={{
                        width: '10vw',
                        height: '10vw',
                        minWidth: '100px',
                        minHeight: '100px',
                        maxWidth: '200px',
                        maxHeight: '200px',
                        position: 'relative',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '2px solid transparent', // Hover effect border
                        transition: 'border-color 0.2s'
                    }}>
                        <Image
                            src={user.image || "https://via.placeholder.com/150"}
                            alt={user.name || "Profile"}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                        />
                    </div>
                    <span style={{ color: '#808080', fontSize: '1.2rem', marginTop: '0.5rem', transition: 'color 0.2s' }}>{user.name}</span>
                    <style jsx>{`
            .profile-item:hover div {
              border-color: white;
            }
            .profile-item:hover span {
              color: white;
            }
          `}</style>
                </div>
            ))}
        </div>
    );
}
